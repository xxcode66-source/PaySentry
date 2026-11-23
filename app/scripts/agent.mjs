#!/usr/bin/env node
/**
 * PaySentry agent CLI — the "autonomous worker" for the guarded payment demo.
 *
 * This script IS the AI-agent stand-in: it spends from its owner's balance
 * inside a bounded session (per-tx limit, lifetime cap, expiry, enforced CoP).
 * Every attempt — successful or blocked — lands on the on-chain audit trail.
 *
 * Setup:
 *   cd app
 *   npm install (already done if the UI was built)
 *   export AGENT_PRIVATE_KEY=0x...        # the agent wallet (never commit!)
 *   export GUARD_ADDRESS=0x...            # deployed PaymentGuard
 *   export REGISTRY_ADDRESS=0x...         # deployed PayeeRegistry
 *   # optional: RPC_URL (defaults to https://rpc-test.qday.info)
 *
 * Usage:
 *   node scripts/agent.mjs inspect --session 0
 *   node scripts/agent.mjs pay --session 0 --payee 0x... --name "Warung Maju Jaya" --amount 2
 *
 * The `pay` flow mirrors what a real agent would do:
 *   1. read the session's limits from chain (inspect)
 *   2. check its own budget before asking
 *   3. attempt agentPay — the guard runs the CoP check and either executes or reverts
 */
import { createPublicClient, createWalletClient, formatUnits, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const CHAIN = {
  id: 44005,
  name: "QDay Aevum Testnet",
  nativeCurrency: { name: "tQDAY", symbol: "tQDAY", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL ?? "https://rpc-test.qday.info"] } },
};

const GUARD = process.env.GUARD_ADDRESS || "";
const REGISTRY = process.env.REGISTRY_ADDRESS || "";

// Minimal ABIs (inlined so this script runs on plain Node, no TS build needed)
const GUARD_ABI = [
  {
    type: "function",
    name: "sessions",
    stateMutability: "view",
    inputs: [{ name: "sessionId", type: "uint256" }],
    outputs: [
      { name: "ownerAddr", type: "address" },
      { name: "agent", type: "address" },
      { name: "token", type: "address" },
      { name: "maxPerTx", type: "uint256" },
      { name: "capTotal", type: "uint256" },
      { name: "spentTotal", type: "uint256" },
      { name: "expiresAt", type: "uint64" },
      { name: "active", type: "bool" },
      { name: "mode", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "sessionUsage",
    stateMutability: "view",
    inputs: [{ name: "sessionId", type: "uint256" }],
    outputs: [
      { name: "spent", type: "uint256" },
      { name: "cap", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "expiresAt", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "agentPay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionId", type: "uint256" },
      { name: "payee", type: "address" },
      { name: "expectedName", type: "string" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "result_", type: "uint8" }],
  },
];

const CHECK_PAYEE_ABI = [
  {
    type: "function",
    name: "checkPayee",
    stateMutability: "view",
    inputs: [
      { name: "payee", type: "address" },
      { name: "name", type: "string" },
    ],
    outputs: [
      { name: "result", type: "uint8" },
      { name: "matchedAs", type: "string" },
      { name: "level", type: "uint8" },
    ],
  },
];

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1];
  }
  args._ = argv.filter((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1]?.slice(0, 2) !== "--");
  return args;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!GUARD || GUARD.length !== 42) {
    console.error(c.red("GUARD_ADDRESS is not set — deploy the contracts and export it."));
    process.exit(1);
  }
  if (!process.env.AGENT_PRIVATE_KEY) {
    console.error(c.red("AGENT_PRIVATE_KEY is not set. Never use a funded main key on testnets you care about."));
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);
  const client = createPublicClient({ chain: CHAIN, transport: http(CHAIN.rpcUrls.default.http[0]) });
  const wallet = createWalletClient({ account, chain: CHAIN, transport: http(CHAIN.rpcUrls.default.http[0]) });

  const banner = () => {
    console.log(c.bold("\n  PaySentry agent") + c.dim("  — bounded autonomous spend on Aevum"));
    console.log(c.dim(`  agent : ${account.address}`));
    console.log(c.dim(`  guard : ${GUARD}\n`));
  };

  const sessionId = BigInt(args.session ?? "0");

  // ---- inspect ------------------------------------------------------------
  async function inspect() {
    const s = await client.readContract({
      address: GUARD,
      abi: GUARD_ABI,
      functionName: "sessions",
      args: [sessionId],
    });
    const usage = await client.readContract({
      address: GUARD,
      abi: GUARD_ABI,
      functionName: "sessionUsage",
      args: [sessionId],
    });
    const [owner, agent, token, maxPerTx, capTotal, spentTotal, expiresAt, active] = s;
    const [spent, cap, isActive, expiry] = usage;
    console.log(c.bold(`  session #${sessionId}`));
    console.log(`  owner     ${c.cyan(owner)}`);
    console.log(`  agent     ${agent === account.address ? c.green(agent + "  (you)") : c.amber(agent)}`);
    console.log(`  token     ${token}`);
    console.log(`  limits    max/tx ${c.bold(formatUnits(maxPerTx, 6))} tUSD8 · lifetime cap ${c.bold(formatUnits(capTotal, 6))}`);
    console.log(`  spent     ${formatUnits(spentTotal, 6)} / ${formatUnits(cap, 6)} tUSD8`);
    console.log(`  expires   ${new Date(Number(expiry) * 1000).toISOString()} (${new Date(Number(expiry) * 1000) - new Date() > 0 ? c.green("valid") : c.red("expired")})`);
    console.log(`  state     ${isActive ? c.green("ACTIVE") : c.red("INACTIVE")}`);
    console.log(`  mode      ${c.cyan("ENFORCE — CoP gates every payment")}`);
  }

  // ---- pay ----------------------------------------------------------------
  async function pay() {
    const payee = args.payee;
    const name = args.name ?? "";
    const amount = parseUnits(args.amount ?? "0", 6);

    if (!payee || !name || amount <= 0n) {
      console.error(c.red("usage: pay --session N --payee 0x... --name \"...\" --amount 2"));
      process.exit(1);
    }

    banner();
    await inspect();

    console.log(c.dim(`\n  ▸ instruction: pay ${formatUnits(amount, 6)} tUSD8 to "${name}" (${payee})`));

    // Pre-flight: the agent asks the registry first (what a well-behaved agent does)
    if (REGISTRY && REGISTRY.length === 42) {
      try {
        const [result, matchedAs] = await client.readContract({
          address: REGISTRY,
          abi: CHECK_PAYEE_ABI,
          functionName: "checkPayee",
          args: [payee, name],
        });
        const labels = ["NOT FOUND", "NO MATCH", "CLOSE MATCH", "FULL MATCH"];
        console.log(`  ▸ pre-flight CoP: ${result === 3 ? c.green(labels[result]) : c.red(labels[result])}${matchedAs ? c.dim(`  (matched "${matchedAs}")`) : ""}`);
        if (result < 2) {
          console.log(c.red("  ▸ agent self-aborted: refusing to submit a payment the guard will block."));
          console.log(c.dim("    (run with --force to attempt anyway — the guard will still revert on-chain)\n"));
          if (!args.force) process.exit(2);
        }
      } catch {
        console.log(c.dim("  ▸ pre-flight skipped (registry not reachable)"));
      }
    }

    console.log(c.dim("  ▸ submitting agentPay to the guard…"));
    try {
      const hash = await wallet.writeContract({
        address: GUARD,
        abi: GUARD_ABI,
        functionName: "agentPay",
        args: [sessionId, payee, name, amount],
      });
      const receipt = await client.waitForTransactionReceipt({ hash });
      console.log(c.green(`  ✓ EXECUTED — payment settled and receipt recorded on-chain`));
      console.log(c.dim(`    tx: ${hash} (status ${receipt.status})\n`));
      process.exit(0);
    } catch (err) {
      const msg = String(err?.details ?? err?.shortMessage ?? err?.message ?? err);
      const blocked =
        msg.includes("BlockedByGuard") ||
        msg.includes("no match") ||
        msg.includes("reverted");
      if (blocked) {
        console.log(c.red("  ✕ BLOCKED BY GUARDRAIL — transaction reverted on-chain"));
        console.log(c.dim("    No funds moved. The attempt is permanently recorded as evidence."));
        console.log(c.dim(`    ${msg.slice(0, 160)}\n`));
        process.exit(3);
      }
      console.error(c.red(`  ✕ failed: ${msg.slice(0, 200)}`));
      process.exit(1);
    }
  }

  banner();
  if (cmd === "inspect") await inspect();
  else if (cmd === "pay") await pay();
  else {
    console.error("usage: agent.mjs inspect|pay  (pay: --session N --payee 0x.. --name \"..\" --amount N)");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

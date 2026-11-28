/**
 * PaySentry MCP tools.
 *
 * Read-only tools always work (no key needed). Write tools are only
 * constructed when AGENT_PRIVATE_KEY is set — otherwise they are not
 * registered at all, so a client can never call them by accident.
 */
import { parseUnits, type Address } from "viem";
import {
  DEPLOY_BLOCK,
  ERC20_ABI,
  GUARD_ABI,
  GUARD_ADDRESS,
  LEVEL_LABELS,
  QDAY_CHAIN,
  QDAY_CHAIN_ID,
  QDAY_RPC,
  REGISTRY_ABI,
  REGISTRY_ADDRESS,
  TUSD8_ADDRESS,
  TUSD8_DECIMALS,
  VERDICT_LABELS,
  agentWallet,
  publicClient,
} from "./chain.js";
import { scanAuditTrail } from "./audit.js";

export type ToolResult = { content: { type: "text"; text: string }[] };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function err(message: string): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }] };
}

// ---------------------------------------------------------------------------
// Read-only
// ---------------------------------------------------------------------------

export async function checkPayee(args: { address: string; name: string }): Promise<ToolResult> {
  try {
    const client = publicClient();
    const [result, matchedAs, level] = (await client.readContract({
      abi: REGISTRY_ABI,
      address: REGISTRY_ADDRESS,
      functionName: "checkPayee",
      args: [args.address as Address, args.name],
    })) as [number, string, number];
    return ok({
      address: args.address,
      checkedName: args.name,
      verdict: VERDICT_LABELS[result] ?? "UNKNOWN",
      verdictCode: result,
      matchedAs,
      level: LEVEL_LABELS[level] ?? level,
      levelCode: level,
      safeToPay:
        result === 3 || result === 2
          ? "Yes — FullMatch or CloseMatch."
          : "No — do not pay this name to this address.",
    });
  } catch (e) {
    return err(`checkPayee failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function getPayee(args: { address: string }): Promise<ToolResult> {
  try {
    const client = publicClient();
    const [displayName, registeredAt, level, attestations] = (await client.readContract({
      abi: REGISTRY_ABI,
      address: REGISTRY_ADDRESS,
      functionName: "payeeOf",
      args: [args.address as Address],
    })) as [string, bigint, number, bigint];
    const attested = (await client.readContract({
      abi: REGISTRY_ABI,
      address: REGISTRY_ADDRESS,
      functionName: "attestedNamesOf",
      args: [args.address as Address],
    })) as string[];
    return ok({
      address: args.address,
      registered: displayName !== "",
      displayName,
      registeredAt: registeredAt === 0n ? null : new Date(Number(registeredAt) * 1000).toISOString(),
      level: LEVEL_LABELS[level] ?? level,
      attestationCount: Number(attestations),
      attestedNames: attested,
    });
  } catch (e) {
    return err(`getPayee failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function getAuditTrail(args: {
  limit?: number;
  kind?: string;
  address?: string;
  fromBlock?: number;
}): Promise<ToolResult> {
  try {
    const scan = await scanAuditTrail(
      args.fromBlock !== undefined ? BigInt(args.fromBlock) : DEPLOY_BLOCK,
      args.limit ?? 50,
      args.kind,
      args.address,
    );
    return ok({
      ...scan,
      note: "A blocked payment reverts, which wipes its logs — blocked attempts never appear as log events by EVM design.",
    });
  } catch (e) {
    return err(`get_audit_trail failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function getGuardConfig(): Promise<ToolResult> {
  const client = publicClient();
  const head = await client.getBlockNumber();
  const agent = agentWallet();
  return ok({
    chain: "QDay Aevum Testnet",
    chainId: QDAY_CHAIN_ID,
    rpc: QDAY_RPC,
    contracts: {
      payeeRegistry: REGISTRY_ADDRESS,
      paymentGuard: GUARD_ADDRESS,
      tusd8: TUSD8_ADDRESS,
    },
    tusd8Decimals: TUSD8_DECIMALS,
    deployBlock: Number(DEPLOY_BLOCK),
    headBlock: Number(head),
    agentWallet: agent ? agent.account.address : null,
    writeToolsEnabled: agent !== null,
    modes: { warn: 0, enforce: 1, note: "Agents are always Enforce mode." },
  });
}

// ---------------------------------------------------------------------------
// Write (only when AGENT_PRIVATE_KEY is set)
// ---------------------------------------------------------------------------

export async function registerPayee(args: { displayName: string }): Promise<ToolResult> {
  const agent = agentWallet();
  if (!agent) return err("Write tools disabled: AGENT_PRIVATE_KEY is not set in .env.");
  try {
    const hash = await agent.wallet.writeContract({
      chain: QDAY_CHAIN,
      abi: REGISTRY_ABI,
      address: REGISTRY_ADDRESS,
      functionName: "registerPayee",
      args: [args.displayName],
    });
    const client = publicClient();
    const receipt = await client.waitForTransactionReceipt({ hash });
    return ok({
      registeredName: args.displayName,
      agentAddress: agent.account.address,
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
      status: receipt.status,
      explorer: `https://explorer-test.qday.info/tx/${hash}`,
    });
  } catch (e) {
    return err(`registerPayee failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function executeGuardedPayment(args: {
  payee: string;
  expectedName: string;
  amount: string;
  mode?: number;
}): Promise<ToolResult> {
  const agent = agentWallet();
  if (!agent) return err("Write tools disabled: AGENT_PRIVATE_KEY is not set in .env.");
  const mode = args.mode ?? 1; // Enforce default — agents are always enforced
  try {
    const client = publicClient();
    const amountWei = parseUnits(args.amount, TUSD8_DECIMALS);

    // 1. CoP pre-check (read-only) — Enforce blocks mismatches, no funds move.
    const [result, matchedAs] = (await client.readContract({
      abi: REGISTRY_ABI,
      address: REGISTRY_ADDRESS,
      functionName: "checkPayee",
      args: [args.payee as Address, args.expectedName],
    })) as [number, string, number];
    const bad = result === 0 || result === 1;
    if (bad && mode === 1) {
      return ok({
        paid: false,
        blocked: true,
        verdict: VERDICT_LABELS[result],
        matchedAs,
        message: `Blocked (Enforce): name "${args.expectedName}" does not match the on-chain identity of ${args.payee}. No funds moved.`,
      });
    }

    // 2. Balance + allowance.
    const balance = (await client.readContract({
      abi: ERC20_ABI,
      address: TUSD8_ADDRESS,
      functionName: "balanceOf",
      args: [agent.account.address],
    })) as bigint;
    if (balance < amountWei) {
      return err(
        `Insufficient tUSD8: agent holds ${balance} base units (${Number(balance) / 1e6} tUSD8), needs ${args.amount} tUSD8. Fund the agent wallet first.`,
      );
    }
    const allowance = (await client.readContract({
      abi: ERC20_ABI,
      address: TUSD8_ADDRESS,
      functionName: "allowance",
      args: [agent.account.address, GUARD_ADDRESS],
    })) as bigint;
    if (allowance < amountWei) {
      const approveHash = await agent.wallet.writeContract({
      chain: QDAY_CHAIN,
        abi: ERC20_ABI,
        address: TUSD8_ADDRESS,
        functionName: "approve",
        args: [GUARD_ADDRESS, amountWei],
      });
      await client.waitForTransactionReceipt({ hash: approveHash });
    }

    // 3. Execute the guarded transfer.
    const txHash = await agent.wallet.writeContract({
      chain: QDAY_CHAIN,
      abi: GUARD_ABI,
      address: GUARD_ADDRESS,
      functionName: "executeGuarded",
      args: [TUSD8_ADDRESS, args.payee as Address, args.expectedName, amountWei, mode],
    });
    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    return ok({
      paid: true,
      verdict: VERDICT_LABELS[result],
      matchedAs,
      amount: `${args.amount} tUSD8`,
      payee: args.payee,
      expectedName: args.expectedName,
      mode: mode === 1 ? "ENFORCE" : "WARN",
      txHash,
      blockNumber: Number(receipt.blockNumber),
      status: receipt.status,
      explorer: `https://explorer-test.qday.info/tx/${txHash}`,
    });
  } catch (e) {
    return err(`execute_guarded_payment failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Dry-run (eth_call simulation, no funds move) for a write tool. */
export async function simulateGuardedPayment(args: {
  payee: string;
  expectedName: string;
  amount: string;
}): Promise<ToolResult> {
  const agent = agentWallet();
  if (!agent) return err("Simulation needs AGENT_PRIVATE_KEY in .env (for the from address).");
  try {
    const client = publicClient();
    const amountWei = parseUnits(args.amount, TUSD8_DECIMALS);
    const [result, matchedAs] = (await client.readContract({
      abi: REGISTRY_ABI,
      address: REGISTRY_ADDRESS,
      functionName: "checkPayee",
      args: [args.payee as Address, args.expectedName],
    })) as [number, string, number];
    const sim = await client.simulateContract({
      account: agent.account,
      chain: QDAY_CHAIN,
      abi: GUARD_ABI,
      address: GUARD_ADDRESS,
      functionName: "executeGuarded",
      args: [TUSD8_ADDRESS, args.payee as Address, args.expectedName, amountWei, 1],
    });
    return ok({
      simulated: true,
      verdict: VERDICT_LABELS[result],
      matchedAs,
      wouldPay: result === 2 || result === 3,
      simulationResult: String(sim.result),
      note: "eth_call only — no transaction was sent and no funds moved.",
    });
  } catch (e) {
    return err(`Simulation failed (this usually means the call would revert): ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * paysentry-sdk — drop-in Confirmation-of-Payee for stablecoin payments on QDay Aevum.
 *
 * Any dapp (checkout, invoice, agent) calls `guardPay()` right before it moves funds.
 * The SDK runs the on-chain CoP check first and refuses to proceed when the intended
 * recipient name does not match the payee's verified identity.
 *
 * Pure viem — no wagmi/RainbowKit dependency — so it works anywhere viem works
 * (browser, Node, agent scripts, and later React Native / mobile).
 *
 * Defaults point at the PaySentry contracts already deployed to QDay Aevum Testnet
 * (chain 44005); every address is overridable so you can plug in your own deployment.
 */
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseUnits,
} from "viem";

// ---------------------------------------------------------------------------
// Chain + contract defaults (the live PaySentry deployment)
// ---------------------------------------------------------------------------

export const QDAY_CHAIN_ID = 44005;
export const QDAY_RPC = "https://rpc-test.qday.info";

export const DEFAULT_REGISTRY_ADDRESS =
  "0xfFB0288590944e42aFF84033a8FF5A6c35d34b22";
export const DEFAULT_GUARD_ADDRESS =
  "0x47e29aB215712b887F3A642d9ba60Df8d6F83828";
export const DEFAULT_TUSD8_ADDRESS =
  "0x456569838f1d43009A91ebA4263147Afd7233483";

const qdayChain = (rpc: string): Chain =>
  defineChain({
    id: QDAY_CHAIN_ID,
    name: "QDay Aevum Testnet",
    nativeCurrency: { name: "tQDAY", symbol: "tQDAY", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
    testnet: true,
  });

/** Ready-to-use chain object for `createWalletClient`/`createPublicClient`. */
export const QDAY_CHAIN: Chain = qdayChain(QDAY_RPC);

// ---------------------------------------------------------------------------
// ABIs (minimal — just what the SDK needs)
// ---------------------------------------------------------------------------

const REGISTRY_ABI = [
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
] as const;

const GUARD_ABI = [
  {
    type: "function",
    name: "executeGuarded",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "payee", type: "address" },
      { name: "expectedName", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "mode", type: "uint8" },
    ],
    outputs: [{ name: "result_", type: "uint8" }],
  },
  {
    type: "function",
    name: "createSession",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agent", type: "address" },
      { name: "token", type: "address" },
      { name: "maxPerTx", type: "uint256" },
      { name: "capTotal", type: "uint256" },
      { name: "duration", type: "uint64" },
      { name: "mode", type: "uint8" },
    ],
    outputs: [{ name: "sessionId", type: "uint256" }],
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum MatchResult {
  NotFound = 0,
  NoMatch = 1,
  CloseMatch = 2,
  FullMatch = 3,
}

export enum GuardMode {
  Warn = 0,
  Enforce = 1,
}

export type CoPVerdict = {
  result: MatchResult;
  /** registry label matched, if any */
  matchedAs: string;
  /** 0 None · 1 SelfClaimed · 2 Attested */
  level: number;
};

export type PaySentryConfig = {
  rpc?: string;
  chain?: Chain;
  registryAddress?: Address;
  guardAddress?: Address;
  tusd8Address?: Address;
};

export type GuardPayResult = {
  verdict: CoPVerdict;
  verdictLabel: "NOT FOUND" | "NO MATCH" | "CLOSE MATCH" | "FULL MATCH";
  /** true when the transfer was executed on-chain */
  paid: boolean;
  /** transaction hash when `paid` */
  txHash?: Address;
  /** human explanation (use for UI messaging / logs) */
  message: string;
};

type Resolved = Required<
  Pick<PaySentryConfig, "rpc" | "registryAddress" | "guardAddress" | "tusd8Address">
>;

/** Wallet-ish signer: anything viem can writeContract with. */
type Signer = {
  account: { address: Address };
  writeContract: (p: unknown) => Promise<Address>;
};

const LABELS = ["NOT FOUND", "NO MATCH", "CLOSE MATCH", "FULL MATCH"] as const;
export const verdictLabel = (r: MatchResult) => LABELS[r] ?? "UNKNOWN";

function resolve(config: PaySentryConfig = {}): Resolved {
  return {
    rpc: config.rpc ?? QDAY_RPC,
    registryAddress: config.registryAddress ?? DEFAULT_REGISTRY_ADDRESS,
    guardAddress: config.guardAddress ?? DEFAULT_GUARD_ADDRESS,
    tusd8Address: config.tusd8Address ?? DEFAULT_TUSD8_ADDRESS,
  };
}

// ---------------------------------------------------------------------------
// Read primitive
// ---------------------------------------------------------------------------

/** Read the on-chain CoP verdict for a payee/name pair. */
export async function checkPayee(
  payee: Address,
  expectedName: string,
  config: PaySentryConfig = {}
): Promise<CoPVerdict> {
  const c = resolve(config);
  const chain = config.chain ?? qdayChain(c.rpc);
  const client = createPublicClient({ chain, transport: http(c.rpc) });
  const [result, matchedAs, level] = (await client.readContract({
    abi: REGISTRY_ABI,
    address: c.registryAddress,
    functionName: "checkPayee",
    args: [payee, expectedName],
  })) as [number, string, number];
  return { result, matchedAs, level };
}

/** Convenience: does this payee/name pair pass the CoP check? */
export async function isPayeeConfirmed(
  payee: Address,
  expectedName: string,
  config: PaySentryConfig = {}
): Promise<boolean> {
  const v = await checkPayee(payee, expectedName, config);
  return v.result === MatchResult.FullMatch || v.result === MatchResult.CloseMatch;
}

// ---------------------------------------------------------------------------
// Allowance helper
// ---------------------------------------------------------------------------

export async function approveAllowance(
  signer: Signer,
  spender: Address,
  amountWei: bigint,
  token: Address,
  config: PaySentryConfig = {}
): Promise<Address> {
  const c = resolve(config);
  const chain = config.chain ?? qdayChain(c.rpc);
  const client = createPublicClient({ chain, transport: http(c.rpc) });
  const txHash = await signer.writeContract({
    abi: ERC20_ABI,
    address: token,
    functionName: "approve",
    args: [spender, amountWei],
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

// ---------------------------------------------------------------------------
// Guarded payment
// ---------------------------------------------------------------------------

/**
 * Run the CoP check, then — if safe — pay `amount` tUSD8 to `payee`.
 *
 * In Enforce mode a NoMatch/NotFound is blocked (returned `paid:false`, no funds move).
 * In Warn mode it still pays but the verdict + mismatch are returned for UI messaging.
 */
export async function guardPay(
  args: {
    payee: Address;
    expectedName: string;
    amount: string; // human tUSD8, e.g. "25"
    signer: Signer;
    mode?: GuardMode;
    onAllowanceNeeded?: () => void;
  },
  config: PaySentryConfig = {}
): Promise<GuardPayResult> {
  const c = resolve(config);
  const chain = config.chain ?? qdayChain(c.rpc);
  const client = createPublicClient({ chain, transport: http(c.rpc) });
  const { payee, expectedName, amount, mode = GuardMode.Enforce } = args;
  const amountWei = parseUnits(amount, 6);

  // 1. CoP pre-check (read-only)
  const verdict = await checkPayee(payee, expectedName, config);
  const bad = verdict.result === MatchResult.NoMatch || verdict.result === MatchResult.NotFound;

  if (bad && mode === GuardMode.Enforce) {
    return {
      verdict,
      verdictLabel: verdictLabel(verdict.result),
      paid: false,
      message: `Blocked: payee name "${expectedName}" does not match on-chain identity. No funds moved.`,
    };
  }

  // 2. allowance → approve if needed
  const allowance = (await client.readContract({
    abi: ERC20_ABI,
    address: c.tusd8Address,
    functionName: "allowance",
    args: [args.signer.account.address, c.guardAddress],
  })) as bigint;
  if (allowance < amountWei) {
    args.onAllowanceNeeded?.();
    await approveAllowance(args.signer, c.guardAddress, amountWei, c.tusd8Address, config);
  }

  // 3. execute the guarded transfer
  const txHash = await args.signer.writeContract({
    abi: GUARD_ABI,
    address: c.guardAddress,
    functionName: "executeGuarded",
    args: [c.tusd8Address, payee, expectedName, amountWei, mode],
  });

  return {
    verdict,
    verdictLabel: verdictLabel(verdict.result),
    paid: true,
    txHash,
    message: `Paid ${amount} tUSD8 to "${expectedName}" — ${verdictLabel(verdict.result)} confirmed on-chain.`,
  };
}

// ---------------------------------------------------------------------------
// Agent session (bounded autonomous spend)
// ---------------------------------------------------------------------------

const SESSION_CREATED_TOPIC =
  "0x" +
  "c1d4f4bb12d144171d7c8e5fbe62e01e43d1a7c32b8b25b4c0bf9b2b8b0c8b8a";

/**
 * Create a bounded session so an agent can spend the owner's tokens inside hard
 * limits (per-tx, lifetime cap, expiry). Returns the on-chain session id.
 */
export async function createAgentSession(
  args: {
    agent: Address;
    token?: Address;
    maxPerTx: string; // tUSD8
    capTotal: string; // tUSD8
    durationDays: number;
    signer: Signer;
  },
  config: PaySentryConfig = {}
): Promise<{ sessionId: bigint; txHash: Address }> {
  const c = resolve(config);
  const chain = config.chain ?? qdayChain(c.rpc);
  const client = createPublicClient({ chain, transport: http(c.rpc) });
  const token = args.token ?? c.tusd8Address;
  const capWei = parseUnits(args.capTotal, 6);

  const allowance = (await client.readContract({
    abi: ERC20_ABI,
    address: c.tusd8Address,
    functionName: "allowance",
    args: [args.signer.account.address, c.guardAddress],
  })) as bigint;
  if (allowance < capWei) {
    await approveAllowance(args.signer, c.guardAddress, capWei, c.tusd8Address, config);
  }

  const txHash = await args.signer.writeContract({
    abi: GUARD_ABI,
    address: c.guardAddress,
    functionName: "createSession",
    args: [
      args.agent,
      token,
      parseUnits(args.maxPerTx, 6),
      capWei,
      BigInt(args.durationDays) * 86400n,
      1, // Enforce — agents are always enforced
    ],
  });
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });

  // Parse sessionId from the SessionCreated event (indexed arg #1).
  let sessionId = 0n;
  for (const l of receipt.logs as { topics?: string[] }[]) {
    if (l.topics?.length === 4) {
      sessionId = BigInt(l.topics[1] ?? "0x0");
      break;
    }
  }
  void SESSION_CREATED_TOPIC;
  return { sessionId, txHash };
}

// Re-exported for convenience so consumers can build their own viem signer.
export { createPublicClient, createWalletClient, defineChain, http };
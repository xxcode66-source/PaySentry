/**
 * Chain, contract addresses, ABIs and viem clients.
 * Mirrors sdk/src/index.ts + app/src/lib/web3/addresses.ts so the MCP
 * server talks to the exact same live deployment.
 */
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Account,
  type Address,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const QDAY_CHAIN_ID = 44005;
export const QDAY_RPC = process.env.QDAY_RPC_URL ?? "https://rpc-test.qday.info";
export const DEPLOY_BLOCK = 3931234n;

export const REGISTRY_ADDRESS =
  "0xfFB0288590944e42aFF84033a8FF5A6c35d34b22" as Address;
export const GUARD_ADDRESS =
  "0x47e29aB215712b887F3A642d9ba60Df8d6F83828" as Address;
export const TUSD8_ADDRESS =
  "0x456569838f1d43009A91ebA4263147Afd7233483" as Address;
export const TUSD8_DECIMALS = 6;

export const QDAY_CHAIN: Chain = defineChain({
  id: QDAY_CHAIN_ID,
  name: "QDay Aevum Testnet",
  nativeCurrency: { name: "tQDAY", symbol: "tQDAY", decimals: 18 },
  rpcUrls: { default: { http: [QDAY_RPC] } },
  testnet: true,
});

export const VERDICT_LABELS = ["NOT FOUND", "NO MATCH", "CLOSE MATCH", "FULL MATCH"] as const;
export const LEVEL_LABELS = ["None", "SelfClaimed", "Attested"] as const;

export const REGISTRY_ABI = [
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
  {
    type: "function",
    name: "payeeOf",
    stateMutability: "view",
    inputs: [{ name: "payee", type: "address" }],
    outputs: [
      { name: "displayName", type: "string" },
      { name: "registeredAt", type: "uint64" },
      { name: "level", type: "uint8" },
      { name: "attestations", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "attestedNamesOf",
    stateMutability: "view",
    inputs: [{ name: "payee", type: "address" }],
    outputs: [{ name: "", type: "string[]" }],
  },
  {
    type: "function",
    name: "registerPayee",
    stateMutability: "nonpayable",
    inputs: [{ name: "displayName", type: "string" }],
    outputs: [],
  },
] as const;

export const GUARD_ABI = [
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
] as const;

export const ERC20_ABI = [
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
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function publicClient(): PublicClient {
  return createPublicClient({ chain: QDAY_CHAIN, transport: http(QDAY_RPC) });
}

export function agentWallet(): {
  account: Account;
  wallet: WalletClient<Transport, typeof QDAY_CHAIN, Account>;
} | null {
  const key = process.env.AGENT_PRIVATE_KEY;
  if (!key || key === "0x" || key.length < 10) return null;
  const account = privateKeyToAccount(key as `0x${string}`);
  const wallet = createWalletClient({ account, chain: QDAY_CHAIN, transport: http(QDAY_RPC) });
  return { account, wallet };
}

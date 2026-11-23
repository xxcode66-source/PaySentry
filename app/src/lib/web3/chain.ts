import { defineChain } from "viem";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-test.qday.info";
export const EXPLORER_URL = (process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-test.qday.info").replace(
  /\/$/,
  ""
);

export const qdayAevum = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 44005),
  name: "QDay Aevum Testnet",
  nativeCurrency: { name: "tQDAY", symbol: "tQDAY", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "QDay Explorer", url: EXPLORER_URL } },
  testnet: true,
});

export const txLink = (hash: string): string => `${EXPLORER_URL}/tx/${hash}`;
export const addressLink = (address: string): string => `${EXPLORER_URL}/address/${address}`;

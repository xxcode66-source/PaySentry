import { formatUnits, parseUnits } from "viem";

const TOKEN_DECIMALS = 6;

export function formatUsd(value: bigint | undefined): string {
  if (value === undefined) return "—";
  const amount = formatUnits(value, TOKEN_DECIMALS);
  const [whole, fraction = ""] = amount.split(".");
  const trimmedFraction = fraction.replace(/0+$/, "").slice(0, 2);
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

export function parseUsd(value: string): bigint | undefined {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{0,6})?$/.test(trimmed)) return undefined;
  return parseUnits(trimmed, TOKEN_DECIMALS);
}

export function shortAddr(address: string | undefined, chars = 4): string {
  if (!address) return "—";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function durationLeft(expiry: number): string {
  const seconds = expiry - Math.floor(Date.now() / 1000);
  if (seconds <= 0) return "expired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function explainTxError(error: Error): { title: string; desc: string } {
  const message = error.message || "The transaction could not be completed.";
  if (message.includes("BlockedByGuard")) {
    return {
      title: "Payment blocked by the guard",
      desc: "The payee name did not pass the on-chain check. No tokens were transferred.",
    };
  }
  return { title: "Transaction failed", desc: message.slice(0, 240) };
}

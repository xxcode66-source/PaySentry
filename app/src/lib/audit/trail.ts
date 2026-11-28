// Shared audit-trail data layer: raw eth_getLogs fetch + event decoders.
// Extracted from AuditPanel.tsx (2026-11-28) so the trail can be scanned
// once and shared by the Audit panel and the Overview panel.

import { Ban, Bot, FileSearch, Fingerprint, Receipt, XOctagon } from "lucide-react";
import { formatUsd, shortAddr } from "@/lib/format";

export type Kind = "check" | "exec" | "blocked" | "agentExec" | "agentBlocked" | "session" | "registry";

export interface AuditRow {
  key: string;
  kind: Kind;
  title: string;
  detail: string;
  hash: string;
  blockNumber: bigint;
  ts: number;
  /** Structured fields for the professional UI — never parsed back from `detail`. */
  verdict?: string;
  amount?: string;
  /** Lowercase addresses involved in this event (payer, payee, owner,
      agent, verifier…). Used by the Audit "Aktivitas saya" filter. */
  actors?: string[];
}

export const KIND_META: Record<Kind, { icon: typeof Receipt; cls: string; label: string; tone: "ok" | "warn" | "bad" | "info" | "neutral" }> = {
  check: { icon: FileSearch, cls: "text-neon-cyan bg-neon-cyan/10 ring-neon-cyan/20", label: "CoP check", tone: "info" },
  exec: { icon: Receipt, cls: "text-neon-green bg-neon-green/10 ring-neon-green/20", label: "Payment", tone: "ok" },
  blocked: { icon: XOctagon, cls: "text-neon-red bg-neon-red/10 ring-neon-red/20", label: "Blocked", tone: "bad" },
  agentExec: { icon: Bot, cls: "text-neon-green bg-neon-green/10 ring-neon-green/20", label: "Agent payment", tone: "ok" },
  agentBlocked: { icon: Ban, cls: "text-neon-red bg-neon-red/10 ring-neon-red/20", label: "Agent blocked", tone: "bad" },
  session: { icon: Fingerprint, cls: "text-neon-violet bg-neon-violet/10 ring-neon-violet/20", label: "Session", tone: "warn" },
  registry: { icon: Fingerprint, cls: "text-slate-300 bg-white/10 ring-white/10", label: "Registry", tone: "neutral" },
};

export const VERDICT_PILL: Record<string, string> = {
  "FULL MATCH": "border-neon-green/40 bg-neon-green/10 text-neon-green",
  "CLOSE MATCH": "border-neon-amber/40 bg-neon-amber/10 text-neon-amber",
  "NO MATCH": "border-neon-red/40 bg-neon-red/10 text-neon-red",
  "NOT FOUND": "border-slate-500/40 bg-slate-500/10 text-slate-400",
};

export const FILTERS: { id: string; label: string; match: (k: Kind) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "payments", label: "Payments", match: (k) => k === "exec" || k === "agentExec" },
  { id: "blocked", label: "Blocked", match: (k) => k === "blocked" || k === "agentBlocked" },
  { id: "agents", label: "Agent", match: (k) => k.startsWith("agent") || k === "session" },
  { id: "registry", label: "Registry", match: (k) => k === "registry" },
];

// ---------------------------------------------------------------------------

// Raw eth_getLogs — QDay rejects viem's getLogs encoding ("Missing or invalid
// parameters") but accepts a plain eth_getLogs JSON-RPC call. We fetch raw logs
// and decode the events ourselves from topics + data.
//
// FIXED (2026-11-28) — three bugs made the audit trail always empty:
//  1. Scan window: the old code only scanned head-30,000 blocks. QDay testnet
//     makes ~1 block/sec, so that is only ~8.4 hours. The only successful
//     payments so far (blocks 4,021,205 and 4,022,018, 24 Nov 2026) are
//     ~250k blocks behind head, so they were never in range. We now scan
//     from the deployment block (both contracts were created in block
//     3,931,234 on 2026-11-23, tx 0xcfa2fc32… / 0x3cbf462c… — update this
//     constant if the contracts are ever redeployed).
//  2. Decoder: log `data` from eth_getLogs starts with "0x". The old
//     decodeString/decodeUint sliced it without stripping the prefix, so
//     slot 0 parsed as "0x0x…" and BigInt() threw — one GuardCheck log was
//     enough to abort the whole boot() and leave the panel empty.
//  3. PaymentExecuted slots: the old code read amount=slot 0, result=slot 1,
//     matchedAs=slot 2. The event is
//     PaymentExecuted(payer, payee, token, amount, result, matchedAs), so
//     slot 0 is the token address, slot 1 the amount, slot 2 the result and
//     slot 3 the string offset. Amounts used to decode as the token address.
//  Topic hashes below were verified against keccak256 of the canonical
//  signatures (e.g. GuardCheck 0x868c… and PaymentExecuted 0x1df9… — the
//  old "placeholder" comment on PaymentExecuted was wrong, its hash was
//  already correct).
//  Note: PaymentBlocked / AgentPaymentBlocked are decoded for completeness,
//  but a blocked payment reverts, and a revert wipes the logs it emitted —
//  so a blocked attempt will (by design of the EVM) not appear here as a
//  log. The failed transaction itself is still on-chain via its hash.
// ---------------------------------------------------------------------------

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-test.qday.info";
const STEP = 900n; // QDay caps eth_getLogs range at 1000 blocks
const SCAN_CONCURRENCY = 8;
// Both contracts were deployed in this block (2026-11-23). Update on redeploy.
export const DEPLOY_BLOCK = 3931234n;

async function fetchRawLogsChunk(address: string, from: bigint, to: bigint): Promise<RawLog[]> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        address,
        fromBlock: "0x" + from.toString(16),
        toBlock: "0x" + to.toString(16),
      }],
    }),
  });
  if (!res.ok) throw new Error(`eth_getLogs HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`eth_getLogs: ${json.error.message ?? JSON.stringify(json.error)}`);
  return (json.result ?? []) as RawLog[];
}

export async function fetchRawLogs(
  address: string,
  from: bigint,
  to: bigint,
  onProgress?: (doneBlocks: bigint) => void,
): Promise<{ logs: RawLog[]; failedChunks: number }> {
  const chunks: [bigint, bigint][] = [];
  let start = from;
  while (start <= to) {
    const end = start + STEP - 1n > to ? to : start + STEP - 1n;
    chunks.push([start, end]);
    start = end + 1n;
  }
  const out: RawLog[] = [];
  let failedChunks = 0;
  for (let i = 0; i < chunks.length; i += SCAN_CONCURRENCY) {
    const batch = chunks.slice(i, i + SCAN_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(([s, e]) => fetchRawLogsChunk(address, s, e)),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const [s, e] = batch[j];
      // onProgress receives the size of each finished chunk; the caller sums
      // across both contracts, so the bar tracks total scanned blocks.
      onProgress?.(e - s + 1n);
      if (r.status === "fulfilled") out.push(...r.value);
      else {
        failedChunks += 1;
        console.error("eth_getLogs chunk failed:", s.toString(), e.toString(), r.reason);
      }
    }
  }
  return { logs: out, failedChunks };
}

// ---------------------------------------------------------------------------
// Event decoders — topic0 = keccak256(event signature). Topics hold indexed
// params; `data` holds the non-indexed params in ABI encoding.
// All helpers strip the "0x" prefix first (see header comment, bug #2).
// ---------------------------------------------------------------------------

const TOPIC_GUARD_CHECK =
  "0x868c637aef422314437e7bcddad3c4392933f60744fc2e2463ea41ddac2b3dd7"; // GuardCheck(address,address,string,uint8,uint8,bool)
const TOPIC_PAYMENT_EXECUTED =
  "0x1df95148c684715fe2f057bf2f6321620b35ba37634f9bd5c2e3f1dfdd682860"; // PaymentExecuted(address,address,address,uint256,uint8,string)
const TOPIC_PAYMENT_BLOCKED =
  "0x8d182690661e8b35783a8e71748a46721efa36017e92aa89f9cf1d1a4b69dbb3"; // PaymentBlocked(address,address,string,uint8,string)
const TOPIC_SESSION_CREATED =
  "0x49bdf389828e0b9e2c3d973c7e6523a0d25b6b13bd8a09031e5280e7ed61b951"; // SessionCreated(uint256,address,address,address,uint256,uint256,uint64)
const TOPIC_SESSION_CAP_INCREASED =
  "0x090a5e09ae174f001dd0e5e32f2ba44cd8972bfccd6d02e3f6aa683bc916c7b5"; // SessionCapIncreased(uint256,uint256)
const TOPIC_SESSION_REVOKED =
  "0x8cd7a7d20dd4310706b8aa2c4f57c161e0c23463f5ebf330bed60c5a23f72eb8"; // SessionRevoked(uint256,address)
const TOPIC_AGENT_PAYMENT_EXECUTED =
  "0x208b9484880dfac505a14aeaafee70437fc27f69f839ee30a9feb25d16d0616a"; // AgentPaymentExecuted(uint256,address,address,address,address,uint256,uint8,string)
const TOPIC_AGENT_PAYMENT_BLOCKED =
  "0xee758da95c9856f9c13400a77c546801adb5752a93c0b52c9ba86be69919f240"; // AgentPaymentBlocked(uint256,address,address,address,string,uint8)
const TOPIC_PAYEE_REGISTERED =
  "0x1f299ee68b631663fea6d70351b4d52c91730d43fed40e129930e4e8aa468014"; // PayeeRegistered(address,string,uint64)
const TOPIC_PAYEE_ATTESTED =
  "0x28b7abbcae5f713fcd91bf8f46cdc8a7b9b5753a1bdd45e6a43d5dbf943f2e39"; // PayeeAttested(address,address,string)
const TOPIC_ATTESTATION_REVOKED =
  "0x5795edcb4675b9ff5d3cc6b3261a95360e415d89b91d66197f9b362902b9fc12"; // AttestationRevoked(address,address,string)
const TOPIC_VERIFIER_ADDED =
  "0x6d05492139c5ea989514a5d2150c028041e5c087e2a39967f67dc7d2655adb81"; // VerifierAdded(address)
const TOPIC_VERIFIER_REMOVED =
  "0x44a3cd4eb5cc5748f6169df057b1cb2ae4c383e87cd94663c430e095d4cba424"; // VerifierRemoved(address)
const TOPIC_OWNERSHIP_TRANSFERRED =
  "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"; // OwnershipTransferred(address,address)

const VERDICTS = ["NOT FOUND", "NO MATCH", "CLOSE MATCH", "FULL MATCH"] as const;

function strip0x(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

function decodeString(data: string, slot: number): string {
  const hex = strip0x(data);
  if (hex.length < 64) return "";
  // Slot holds the byte offset to the string (ABI dynamic encoding).
  const offsetHex = hex.slice(slot * 64, slot * 64 + 64) || "0";
  const offsetBytes = Number(BigInt("0x" + offsetHex));
  if (!Number.isFinite(offsetBytes) || offsetBytes < 0 || offsetBytes > hex.length / 2) return "";
  const wordIdx = Math.floor(offsetBytes / 32);
  const lengthHex = hex.slice(wordIdx * 64, wordIdx * 64 + 64) || "0";
  const length = Number(BigInt("0x" + lengthHex));
  if (!Number.isFinite(length) || length < 0 || length > 4096) return "";
  const rawStr = hex.slice(wordIdx * 64 + 64, wordIdx * 64 + 64 + length * 2);
  let str = "";
  for (let i = 0; i < rawStr.length; i += 2) {
    const c = parseInt(rawStr.slice(i, i + 2), 16);
    if (Number.isNaN(c) || c === 0) break;
    str += String.fromCharCode(c);
  }
  return str;
}

function decodeUint(data: string, slot: number): bigint {
  const hex = strip0x(data);
  return BigInt("0x" + (hex.slice(slot * 64, slot * 64 + 64) || "0"));
}

function decodeAddrFromData(data: string, slot: number): string {
  const hex = strip0x(data);
  const word = hex.slice(slot * 64, slot * 64 + 64);
  if (word.length < 64) return "";
  return "0x" + word.slice(24);
}

function decodeAddr(topics: string[], idx: number): string {
  const t = topics?.[idx];
  return t ? "0x" + t.slice(-40) : "";
}

function decodeTopicUint(topics: string[], idx: number): bigint {
  const t = topics?.[idx];
  return t ? BigInt(t) : 0n;
}

export function mapRawToRows(rawLogs: RawLog[]): AuditRow[] {
  const out: AuditRow[] = [];
  for (const raw of rawLogs) {
    const topic0 = raw.topics?.[0] ?? "";
    const hash = raw.transactionHash ?? "";
    const key = `${hash}-${raw.logIndex ?? "0"}`;
    const block = BigInt(raw.blockNumber ?? "0x0");
    const ts = 0;

    switch (topic0) {
      case TOPIC_GUARD_CHECK: {
        const payer = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const name = decodeString(raw.data, 0);
        const result = decodeUint(raw.data, 1);
        const mode = decodeUint(raw.data, 2);
        const blocked = decodeUint(raw.data, 3) !== 0n;
        out.push({
          key,
          kind: "check",
          hash,
          blockNumber: block,
          ts,
          actors: [payer, payee].map((a) => a.toLowerCase()),
          verdict: VERDICTS[Number(result)],
          title: `CoP check — ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `name “${name}” · mode ${mode === 1n ? "ENFORCE" : "WARN"}${blocked ? " · blocked" : ""}`,
        });
        break;
      }
      case TOPIC_PAYMENT_EXECUTED: {
        const payer = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        // data: slot 0 = token, slot 1 = amount, slot 2 = result, slot 3 = matchedAs offset
        const token = decodeAddrFromData(raw.data, 0);
        const amount = decodeUint(raw.data, 1);
        const result = decodeUint(raw.data, 2);
        const matchedAs = decodeString(raw.data, 3);
        out.push({
          key,
          kind: "exec",
          hash,
          blockNumber: block,
          ts,
          actors: [payer, payee].map((a) => a.toLowerCase()),
          verdict: VERDICTS[Number(result)],
          amount: `${formatUsd(amount)} tUSD8`,
          title: `Payment executed — ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `matched “${matchedAs}”${token ? ` · token ${shortAddr(token)}` : ""}`,
        });
        break;
      }
      case TOPIC_PAYMENT_BLOCKED: {
        const payer = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const name = decodeString(raw.data, 0);
        const result = decodeUint(raw.data, 1);
        const reason = decodeString(raw.data, 2);
        out.push({
          key,
          kind: "blocked",
          hash,
          blockNumber: block,
          ts,
          actors: [payer, payee].map((a) => a.toLowerCase()),
          verdict: VERDICTS[Number(result)],
          title: `Payment blocked — ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `name “${name}”${reason ? ` · ${reason}` : ""}`,
        });
        break;
      }
      case TOPIC_SESSION_CREATED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const owner = decodeAddr(raw.topics, 2);
        const agent = decodeAddr(raw.topics, 3);
        const maxPerTx = decodeUint(raw.data, 1);
        const capTotal = decodeUint(raw.data, 2);
        out.push({
          key,
          kind: "session",
          hash,
          blockNumber: block,
          ts,
          actors: [owner, agent].map((a) => a.toLowerCase()),
          title: `Session #${sessionId} created — agent ${shortAddr(agent)}`,
          detail: `owner ${shortAddr(owner)} · max ${formatUsd(maxPerTx)} tUSD8/tx · cap ${formatUsd(capTotal)} tUSD8`,
        });
        break;
      }
      case TOPIC_SESSION_CAP_INCREASED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const newCap = decodeUint(raw.data, 0);
        out.push({
          key,
          kind: "session",
          hash,
          blockNumber: block,
          ts,
          actors: [],
          title: `Session #${sessionId} cap increased`,
          detail: `new lifetime cap ${formatUsd(newCap)} tUSD8`,
        });
        break;
      }
      case TOPIC_SESSION_REVOKED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const owner = decodeAddr(raw.topics, 2);
        out.push({
          key,
          kind: "session",
          hash,
          blockNumber: block,
          ts,
          actors: [owner].map((a) => a.toLowerCase()),
          title: `Session #${sessionId} revoked`,
          detail: `by owner ${shortAddr(owner)}`,
        });
        break;
      }
      case TOPIC_AGENT_PAYMENT_EXECUTED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const owner = decodeAddr(raw.topics, 2);
        const agent = decodeAddr(raw.topics, 3);
        // data: slot 0 = payee, slot 1 = token, slot 2 = amount, slot 3 = result, slot 4 = matchedAs offset
        const payee = decodeAddrFromData(raw.data, 0);
        const amount = decodeUint(raw.data, 2);
        const result = decodeUint(raw.data, 3);
        const matchedAs = decodeString(raw.data, 4);
        out.push({
          key,
          kind: "agentExec",
          hash,
          blockNumber: block,
          ts,
          actors: [payee, owner, agent].map((a) => a.toLowerCase()),
          verdict: VERDICTS[Number(result)],
          amount: `${formatUsd(amount)} tUSD8`,
          title: `Agent payment — session #${sessionId} · ${shortAddr(owner)} → ${shortAddr(payee)}`,
          detail: `agent ${shortAddr(agent)} · matched “${matchedAs}”`,
        });
        break;
      }
      case TOPIC_AGENT_PAYMENT_BLOCKED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const owner = decodeAddr(raw.topics, 2);
        const agent = decodeAddr(raw.topics, 3);
        const payee = decodeAddrFromData(raw.data, 0);
        const name = decodeString(raw.data, 1);
        const result = decodeUint(raw.data, 2);
        out.push({
          key,
          kind: "agentBlocked",
          hash,
          blockNumber: block,
          ts,
          actors: [payee, owner, agent].map((a) => a.toLowerCase()),
          verdict: VERDICTS[Number(result)],
          title: `Agent payment blocked — session #${sessionId} · ${shortAddr(owner)} → ${shortAddr(payee)}`,
          detail: `agent ${shortAddr(agent)} · name “${name}”`,
        });
        break;
      }
      case TOPIC_PAYEE_REGISTERED: {
        const payee = decodeAddr(raw.topics, 1);
        const name = decodeString(raw.data, 0);
        out.push({
          key,
          kind: "registry",
          hash,
          blockNumber: block,
          ts,
          actors: [payee].map((a) => a.toLowerCase()),
          title: `Payee registered — ${shortAddr(payee)}`,
          detail: `claimed name “${name}”`,
        });
        break;
      }
      case TOPIC_PAYEE_ATTESTED: {
        const verifier = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const name = decodeString(raw.data, 0);
        out.push({
          key,
          kind: "registry",
          hash,
          blockNumber: block,
          ts,
          actors: [payee, verifier].map((a) => a.toLowerCase()),
          title: `Payee attested — ${shortAddr(payee)} as “${name}”`,
          detail: `verifier ${shortAddr(verifier)}`,
        });
        break;
      }
      case TOPIC_ATTESTATION_REVOKED: {
        const verifier = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const name = decodeString(raw.data, 0);
        out.push({
          key,
          kind: "registry",
          hash,
          blockNumber: block,
          ts,
          actors: [payee, verifier].map((a) => a.toLowerCase()),
          title: `Attestation revoked — ${shortAddr(payee)} as “${name}”`,
          detail: `verifier ${shortAddr(verifier)}`,
        });
        break;
      }
      case TOPIC_VERIFIER_ADDED: {
        const verifier = decodeAddr(raw.topics, 1);
        out.push({
          key,
          kind: "registry",
          hash,
          blockNumber: block,
          ts,
          actors: [verifier].map((a) => a.toLowerCase()),
          title: `Verifier added — ${shortAddr(verifier)}`,
          detail: "can now attest payee identities",
        });
        break;
      }
      case TOPIC_VERIFIER_REMOVED: {
        const verifier = decodeAddr(raw.topics, 1);
        out.push({
          key,
          kind: "registry",
          hash,
          blockNumber: block,
          ts,
          actors: [verifier].map((a) => a.toLowerCase()),
          title: `Verifier removed — ${shortAddr(verifier)}`,
          detail: "can no longer attest payee identities",
        });
        break;
      }
      case TOPIC_OWNERSHIP_TRANSFERRED: {
        const prev = decodeAddr(raw.topics, 1);
        const next = decodeAddr(raw.topics, 2);
        out.push({
          key,
          kind: "registry",
          hash,
          blockNumber: block,
          ts,
          actors: [prev, next].map((a) => a.toLowerCase()),
          title: `Registry ownership transferred`,
          detail: `${shortAddr(prev)} → ${shortAddr(next)}`,
        });
        break;
      }
      default:
        break;
    }
  }
  return out;
}
export function mergeRows(existing: AuditRow[], incoming: AuditRow[], seen: Set<string>): AuditRow[] {
  const fresh = incoming.filter((r) => {
    if (seen.has(r.key)) return false;
    seen.add(r.key);
    return true;
  });
  if (fresh.length === 0) return existing;
  return [...fresh, ...existing].sort((a, b) =>
    a.blockNumber === b.blockNumber ? 0 : b.blockNumber > a.blockNumber ? 1 : -1
  );
}

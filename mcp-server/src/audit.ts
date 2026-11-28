/**
 * Standalone port of app/src/lib/audit/trail.ts (raw eth_getLogs + decoders).
 * No React / lucide / Next.js imports — plain JSON rows for the MCP tool.
 *
 * Same fixes as the app layer: scan from DEPLOY_BLOCK in 900-block chunks
 * (QDay caps eth_getLogs at 1000), raw JSON-RPC because viem's getLogs
 * encoding is rejected by this RPC, and "0x"-stripping decoders.
 */
import { DEPLOY_BLOCK, GUARD_ADDRESS, QDAY_RPC, REGISTRY_ADDRESS, publicClient } from "./chain.js";

export type AuditKind =
  | "check"
  | "exec"
  | "blocked"
  | "agentExec"
  | "agentBlocked"
  | "session"
  | "registry";

export interface AuditRow {
  kind: AuditKind;
  title: string;
  detail: string;
  txHash: string;
  blockNumber: number;
  verdict?: string;
  amountTusd8?: string;
  actors: string[];
}

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

const STEP = 900n;
const SCAN_CONCURRENCY = 8;

const TOPIC_GUARD_CHECK =
  "0x868c637aef422314437e7bcddad3c4392933f60744fc2e2463ea41ddac2b3dd7";
const TOPIC_PAYMENT_EXECUTED =
  "0x1df95148c684715fe2f057bf2f6321620b35ba37634f9bd5c2e3f1dfdd682860";
const TOPIC_PAYMENT_BLOCKED =
  "0x8d182690661e8b35783a8e71748a46721efa36017e92aa89f9cf1d1a4b69dbb3";
const TOPIC_SESSION_CREATED =
  "0x49bdf389828e0b9e2c3d973c7e6523a0d25b6b13bd8a09031e5280e7ed61b951";
const TOPIC_SESSION_CAP_INCREASED =
  "0x090a5e09ae174f001dd0e5e32f2ba44cd8972bfccd6d02e3f6aa683bc916c7b5";
const TOPIC_SESSION_REVOKED =
  "0x8cd7a7d20dd4310706b8aa2c4f57c161e0c23463f5ebf330bed60c5a23f72eb8";
const TOPIC_AGENT_PAYMENT_EXECUTED =
  "0x208b9484880dfac505a14aeaafee70437fc27f69f839ee30a9feb25d16d0616a";
const TOPIC_AGENT_PAYMENT_BLOCKED =
  "0xee758da95c9856f9c13400a77c546801adb5752a93c0b52c9ba86be69919f240";
const TOPIC_PAYEE_REGISTERED =
  "0x1f299ee68b631663fea6d70351b4d52c91730d43fed40e129930e4e8aa468014";
const TOPIC_PAYEE_ATTESTED =
  "0x28b7abbcae5f713fcd91bf8f46cdc8a7b9b5753a1bdd45e6a43d5dbf943f2e39";
const TOPIC_ATTESTATION_REVOKED =
  "0x5795edcb4675b9ff5d3cc6b3261a95360e415d89b91d66197f9b362902b9fc12";
const TOPIC_VERIFIER_ADDED =
  "0x6d05492139c5ea989514a5d2150c028041e5c087e2a39967f67dc7d2655adb81";
const TOPIC_VERIFIER_REMOVED =
  "0x44a3cd4eb5cc5748f6169df057b1cb2ae4c383e87cd94663c430e095d4cba424";
const TOPIC_OWNERSHIP_TRANSFERRED =
  "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0";

const VERDICTS = ["NOT FOUND", "NO MATCH", "CLOSE MATCH", "FULL MATCH"] as const;

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function formatTusd8(raw: bigint): string {
  const s = raw.toString().padStart(7, "0");
  return `${s.slice(0, -6)}.${s.slice(-6)}`.replace(/\.?0+$/, "") || "0";
}

function strip0x(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

function decodeString(data: string, slot: number): string {
  const hex = strip0x(data);
  if (hex.length < 64) return "";
  const offsetBytes = Number(BigInt("0x" + (hex.slice(slot * 64, slot * 64 + 64) || "0")));
  if (!Number.isFinite(offsetBytes) || offsetBytes < 0 || offsetBytes > hex.length / 2) return "";
  const wordIdx = Math.floor(offsetBytes / 32);
  const length = Number(BigInt("0x" + (hex.slice(wordIdx * 64, wordIdx * 64 + 64) || "0")));
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

async function fetchRawLogsChunk(address: string, from: bigint, to: bigint): Promise<RawLog[]> {
  const res = await fetch(QDAY_RPC, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "PaySentry-MCP/0.1.0",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [
        {
          address,
          fromBlock: "0x" + from.toString(16),
          toBlock: "0x" + to.toString(16),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`eth_getLogs HTTP ${res.status}`);
  const json = (await res.json()) as { error?: { message?: string }; result?: RawLog[] };
  if (json.error) throw new Error(`eth_getLogs: ${json.error.message ?? JSON.stringify(json.error)}`);
  return json.result ?? [];
}

async function fetchRawLogs(
  address: string,
  from: bigint,
  to: bigint,
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
    const results = await Promise.allSettled(batch.map(([s, e]) => fetchRawLogsChunk(address, s, e)));
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled") out.push(...r.value);
      else failedChunks += 1;
    }
  }
  return { logs: out, failedChunks };
}

function mapRawToRows(rawLogs: RawLog[]): AuditRow[] {
  const out: AuditRow[] = [];
  for (const raw of rawLogs) {
    const topic0 = raw.topics?.[0] ?? "";
    const hash = raw.transactionHash ?? "";
    const block = Number(BigInt(raw.blockNumber ?? "0x0"));
    const base = { txHash: hash, blockNumber: block, actors: [] as string[] };

    switch (topic0) {
      case TOPIC_GUARD_CHECK: {
        const payer = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const name = decodeString(raw.data, 0);
        const result = decodeUint(raw.data, 1);
        const mode = decodeUint(raw.data, 2);
        const blocked = decodeUint(raw.data, 3) !== 0n;
        out.push({
          ...base,
          kind: "check",
          actors: [payer, payee],
          verdict: VERDICTS[Number(result)],
          title: `CoP check ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `name "${name}" · mode ${mode === 1n ? "ENFORCE" : "WARN"}${blocked ? " · blocked" : ""}`,
        });
        break;
      }
      case TOPIC_PAYMENT_EXECUTED: {
        const payer = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const amount = decodeUint(raw.data, 1);
        const result = decodeUint(raw.data, 2);
        const matchedAs = decodeString(raw.data, 3);
        out.push({
          ...base,
          kind: "exec",
          actors: [payer, payee],
          verdict: VERDICTS[Number(result)],
          amountTusd8: formatTusd8(amount),
          title: `Payment executed ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `matched "${matchedAs}" · ${formatTusd8(amount)} tUSD8`,
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
          ...base,
          kind: "blocked",
          actors: [payer, payee],
          verdict: VERDICTS[Number(result)],
          title: `Payment blocked ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `name "${name}"${reason ? ` · ${reason}` : ""}`,
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
          ...base,
          kind: "session",
          actors: [owner, agent],
          title: `Session #${sessionId} created — agent ${shortAddr(agent)}`,
          detail: `owner ${shortAddr(owner)} · max ${formatTusd8(maxPerTx)} tUSD8/tx · cap ${formatTusd8(capTotal)} tUSD8`,
        });
        break;
      }
      case TOPIC_SESSION_CAP_INCREASED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const newCap = decodeUint(raw.data, 0);
        out.push({
          ...base,
          kind: "session",
          actors: [],
          title: `Session #${sessionId} cap increased`,
          detail: `new lifetime cap ${formatTusd8(newCap)} tUSD8`,
        });
        break;
      }
      case TOPIC_SESSION_REVOKED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const owner = decodeAddr(raw.topics, 2);
        out.push({
          ...base,
          kind: "session",
          actors: [owner],
          title: `Session #${sessionId} revoked`,
          detail: `by owner ${shortAddr(owner)}`,
        });
        break;
      }
      case TOPIC_AGENT_PAYMENT_EXECUTED: {
        const sessionId = decodeTopicUint(raw.topics, 1);
        const owner = decodeAddr(raw.topics, 2);
        const agent = decodeAddr(raw.topics, 3);
        const payee = decodeAddrFromData(raw.data, 0);
        const amount = decodeUint(raw.data, 2);
        const result = decodeUint(raw.data, 3);
        const matchedAs = decodeString(raw.data, 4);
        out.push({
          ...base,
          kind: "agentExec",
          actors: [payee, owner, agent],
          verdict: VERDICTS[Number(result)],
          amountTusd8: formatTusd8(amount),
          title: `Agent payment — session #${sessionId} · ${shortAddr(owner)} → ${shortAddr(payee)}`,
          detail: `agent ${shortAddr(agent)} · matched "${matchedAs}" · ${formatTusd8(amount)} tUSD8`,
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
          ...base,
          kind: "agentBlocked",
          actors: [payee, owner, agent],
          verdict: VERDICTS[Number(result)],
          title: `Agent payment blocked — session #${sessionId} · ${shortAddr(owner)} → ${shortAddr(payee)}`,
          detail: `agent ${shortAddr(agent)} · name "${name}"`,
        });
        break;
      }
      case TOPIC_PAYEE_REGISTERED: {
        const payee = decodeAddr(raw.topics, 1);
        const name = decodeString(raw.data, 0);
        out.push({
          ...base,
          kind: "registry",
          actors: [payee],
          title: `Payee registered — ${shortAddr(payee)}`,
          detail: `claimed name "${name}"`,
        });
        break;
      }
      case TOPIC_PAYEE_ATTESTED: {
        const verifier = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const name = decodeString(raw.data, 0);
        out.push({
          ...base,
          kind: "registry",
          actors: [payee, verifier],
          title: `Payee attested — ${shortAddr(payee)} as "${name}"`,
          detail: `verifier ${shortAddr(verifier)}`,
        });
        break;
      }
      case TOPIC_ATTESTATION_REVOKED: {
        const verifier = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const name = decodeString(raw.data, 0);
        out.push({
          ...base,
          kind: "registry",
          actors: [payee, verifier],
          title: `Attestation revoked — ${shortAddr(payee)} as "${name}"`,
          detail: `verifier ${shortAddr(verifier)}`,
        });
        break;
      }
      case TOPIC_VERIFIER_ADDED: {
        const verifier = decodeAddr(raw.topics, 1);
        out.push({
          ...base,
          kind: "registry",
          actors: [verifier],
          title: `Verifier added — ${shortAddr(verifier)}`,
          detail: "can now attest payee identities",
        });
        break;
      }
      case TOPIC_VERIFIER_REMOVED: {
        const verifier = decodeAddr(raw.topics, 1);
        out.push({
          ...base,
          kind: "registry",
          actors: [verifier],
          title: `Verifier removed — ${shortAddr(verifier)}`,
          detail: "can no longer attest payee identities",
        });
        break;
      }
      case TOPIC_OWNERSHIP_TRANSFERRED: {
        const prev = decodeAddr(raw.topics, 1);
        const next = decodeAddr(raw.topics, 2);
        out.push({
          ...base,
          kind: "registry",
          actors: [prev, next],
          title: "Registry ownership transferred",
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

export interface AuditScanResult {
  rows: AuditRow[];
  scannedFromBlock: number;
  scannedToBlock: number;
  failedChunks: number;
  counts: Record<string, number>;
}

/**
 * Scan both contracts from `fromBlock` (default: deploy block) to chain head.
 * Returns newest-first rows. A full scan is ~430k blocks and can take a minute;
 * pass fromBlock to bound the window.
 */
export async function scanAuditTrail(
  fromBlock: bigint = DEPLOY_BLOCK,
  limit = 50,
  kindFilter?: string,
  addressFilter?: string,
): Promise<AuditScanResult> {
  const client = publicClient();
  const head = await client.getBlockNumber();
  const [guard, registry] = await Promise.all([
    fetchRawLogs(GUARD_ADDRESS, fromBlock, head),
    fetchRawLogs(REGISTRY_ADDRESS, fromBlock, head),
  ]);
  const rows = mapRawToRows([...guard.logs, ...registry.logs]).sort(
    (a, b) => b.blockNumber - a.blockNumber,
  );
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
  let filtered = rows;
  if (kindFilter) filtered = filtered.filter((r) => r.kind === kindFilter);
  if (addressFilter) {
    const a = addressFilter.toLowerCase();
    filtered = filtered.filter((r) => r.actors.some((x) => x.toLowerCase() === a));
  }
  return {
    rows: filtered.slice(0, limit),
    scannedFromBlock: Number(fromBlock),
    scannedToBlock: Number(head),
    failedChunks: guard.failedChunks + registry.failedChunks,
    counts,
  };
}

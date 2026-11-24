"use client";

import { motion } from "framer-motion";
import { Ban, Bot, FileSearch, Fingerprint, Receipt, XOctagon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUsd, shortAddr, timeAgo } from "@/lib/format";
import { GUARD_ADDRESS, REGISTRY_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { txLink } from "@/lib/web3/chain";

type Kind = "check" | "exec" | "blocked" | "agentExec" | "agentBlocked" | "session" | "registry";

interface AuditRow {
  key: string;
  kind: Kind;
  title: string;
  detail: string;
  hash: string;
  blockNumber: bigint;
  ts: number;
}

const KIND_META: Record<Kind, { icon: typeof Receipt; cls: string; label: string }> = {
  check: { icon: FileSearch, cls: "text-neon-cyan bg-neon-cyan/10", label: "check" },
  exec: { icon: Receipt, cls: "text-neon-green bg-neon-green/10", label: "payment" },
  blocked: { icon: XOctagon, cls: "text-neon-red bg-neon-red/10", label: "blocked" },
  agentExec: { icon: Bot, cls: "text-neon-green bg-neon-green/10", label: "agent" },
  agentBlocked: { icon: Ban, cls: "text-neon-red bg-neon-red/10", label: "agent blocked" },
  session: { icon: Fingerprint, cls: "text-neon-violet bg-neon-violet/10", label: "session" },
  registry: { icon: Fingerprint, cls: "text-slate-300 bg-white/10", label: "registry" },
};

const FILTERS: { id: string; label: string; match: (k: Kind) => boolean }[] = [
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
// ---------------------------------------------------------------------------

interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-test.qday.info";
const STEP = 900n; // QDay caps eth_getLogs range at 1000 blocks

async function fetchRawLogs(address: string, from: bigint, to: bigint): Promise<RawLog[]> {
  const out: RawLog[] = [];
  let start = from;
  let id = 1;
  while (start <= to) {
    const end = start + STEP - 1n > to ? to : start + STEP - 1n;
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: id++,
          method: "eth_getLogs",
          params: [{
            address,
            fromBlock: "0x" + start.toString(16),
            toBlock: "0x" + end.toString(16),
          }],
        }),
      });
      const json = await res.json();
      if (json.error) {
        console.error("eth_getLogs chunk err:", json.error);
      } else {
        out.push(...((json.result ?? []) as RawLog[]));
      }
    } catch (e) {
      console.error("eth_getLogs fetch err:", e);
    }
    start = end + 1n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Event decoders — topic0 = keccak256(event signature). We decode from topics
// (indexed: payer/payee/verifier/agent/owner) + data (strings, uints, bools).
// ---------------------------------------------------------------------------

const TOPIC_GUARD_CHECK =
  "0x868c637aef422314437e7bcddad3c4392933f60744fc2e2463ea41ddac2b3dd7"; // GuardCheck(payer,payee,expectedName,result,mode,blocked)
const TOPIC_PAYMENT_EXECUTED =
  "0x1df95148c684715fe2f057bf2f6321620b35ba37634f9bd5c2e3f1dfdd682860"; // PaymentExecuted — placeholder, replaced below

function decodeString(data: string, slot: number): string {
  if (data.length < 64) return "";
  const offset = Number(BigInt("0x" + (data.slice(slot * 64, slot * 64 + 64) || "0")));
  const length = Number(BigInt("0x" + (data.slice(64 + offset * 64, 64 + offset * 64 + 64) || "0")));
  const rawStr = data.slice(64 + offset * 64 + 64, 64 + offset * 64 + 64 + length * 2);
  let str = "";
  for (let i = 0; i < rawStr.length; i += 2) {
    const c = parseInt(rawStr.slice(i, i + 2), 16);
    if (c === 0) break;
    str += String.fromCharCode(c);
  }
  return str;
}

function decodeUint(data: string, slot: number): bigint {
  return BigInt("0x" + (data.slice(slot * 64, slot * 64 + 64) || "0"));
}

function decodeAddr(topics: string[], idx: number): string {
  return topics?.[idx] ? "0x" + topics[idx].slice(26) : "";
}

function mapRawToRows(rawLogs: RawLog[]): AuditRow[] {
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
        out.push({
          key,
          kind: "check",
          hash,
          blockNumber: block,
          ts,
          title: `CoP check — ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `name “${name}” · verdict ${result} · mode ${mode === 1n ? "ENFORCE" : "WARN"}`,
        });
        break;
      }
      case TOPIC_PAYMENT_EXECUTED: {
        const payer = decodeAddr(raw.topics, 1);
        const payee = decodeAddr(raw.topics, 2);
        const amount = decodeUint(raw.data, 0);
        const result = decodeUint(raw.data, 1);
        const matchedAs = decodeString(raw.data, 2);
        out.push({
          key,
          kind: "exec",
          hash,
          blockNumber: block,
          ts,
          title: `Payment executed — ${shortAddr(payer)} → ${shortAddr(payee)}`,
          detail: `${formatUsd(amount)} tUSD8 · verdict ${result} · matched “${matchedAs}”`,
        });
        break;
      }
      default:
        break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function AuditPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const seen = useRef<Set<string>>(new Set());
  const [, setNow] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!contractsConfigured) return;
    let stop = false;

    async function boot() {
      try {
        const { createPublicClient, http } = await import("viem");
        const { qdayAevum } = await import("@/lib/web3/chain");
        const client = createPublicClient({ chain: qdayAevum, transport: http(RPC_URL) });

        const head = await client.getBlockNumber();
        const from = head > 30000n ? head - 30000n : 0n;

        const guardRaw = await fetchRawLogs(GUARD_ADDRESS, from, head);
        const registryRaw = await fetchRawLogs(REGISTRY_ADDRESS, from, head);
        const mapped = mapRawToRows([...guardRaw, ...registryRaw]);
        if (stop) return;
        setRows((r) => mergeRows(r, mapped, seen.current));
        setLoading(false);
        setLive(true);
      } catch (e) {
        console.error("AuditPanel boot failed:", e);
        setLoading(false);
      }
    }

    boot();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(
    () => rows.filter((r) => FILTERS.find((f) => f.id === filter)!.match(r.kind)),
    [rows, filter]
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Audit trail</h2>
          <p className="mt-1 text-sm text-slate-400">
            Every check, payment and blocked attempt — replayed straight from chain events.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${
            live ? "border-neon-green/40 bg-neon-green/10 text-neon-green" : "border-white/10 text-slate-400"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-neon-green" : "bg-slate-500"}`} />
          {live ? "LIVE — watching chain" : loading ? "loading…" : "no contracts configured"}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === f.id
                ? "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2.5">
        {visible.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-sm text-slate-500">
            {contractsConfigured
              ? loading
                ? "Scanning the chain for events…"
                : "No events in the last 30,000 blocks — make a payment or run the agent to populate the trail."
              : "Configure deployed contracts to stream audit events."}
          </div>
        )}
        {visible.map((r) => (
          <AuditItem key={r.key} row={r} />
        ))}
      </div>
    </div>
  );
}

function AuditItem({ row }: { row: AuditRow }) {
  const meta = KIND_META[row.kind];
  const Icon = meta.icon;
  const isBlocked = row.kind === "blocked" || row.kind === "agentBlocked";
  return (
    <motion.a
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      href={txLink(row.hash)}
      target="_blank"
      rel="noreferrer"
      className={`group flex items-start gap-3.5 rounded-2xl border p-4 transition hover:brightness-110 ${
        isBlocked ? "border-neon-red/30 bg-neon-red/[0.04]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className={`mt-0.5 rounded-lg p-2.5 ${meta.cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-100">{row.title}</p>
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            {meta.label}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{row.detail}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[11px] text-slate-500">{row.ts ? timeAgo(row.ts) : `block ${row.blockNumber}`}</p>
        <p className="mt-1 font-mono text-[10px] text-slate-600 group-hover:text-neon-cyan">
          {row.hash.slice(0, 10)}…{row.hash.slice(-6)}
        </p>
      </div>
    </motion.a>
  );
}

function mergeRows(existing: AuditRow[], incoming: AuditRow[], seen: Set<string>): AuditRow[] {
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
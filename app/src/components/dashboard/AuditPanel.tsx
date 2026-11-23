"use client";

import { motion } from "framer-motion";
import {
  Ban,
  Bot,
  FileSearch,
  Fingerprint,
  Receipt,
  ShieldCheck,
  XOctagon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Log } from "viem";
import { formatUsd, shortAddr, timeAgo } from "@/lib/format";
import { GUARD_ABI, REGISTRY_ABI } from "@/lib/web3/abis";
import { GUARD_ADDRESS, REGISTRY_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { EXPLORER_URL, txLink } from "@/lib/web3/chain";

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
  session: { icon: ShieldCheck, cls: "text-neon-violet bg-neon-violet/10", label: "session" },
  registry: { icon: Fingerprint, cls: "text-slate-300 bg-white/10", label: "registry" },
};

const FILTERS: { id: string; label: string; match: (k: Kind) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "payments", label: "Payments", match: (k) => k === "exec" || k === "agentExec" },
  { id: "blocked", label: "Blocked", match: (k) => k === "blocked" || k === "agentBlocked" },
  { id: "agents", label: "Agent", match: (k) => k.startsWith("agent") || k === "session" },
  { id: "registry", label: "Registry", match: (k) => k === "registry" },
];

export function AuditPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [live, setLive] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const [, setNow] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow((x) => x + 1), 30000); // refresh relative times
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!contractsConfigured) return;
    let stop = false;
    let unwatchFns: Array<() => void> = [];

    async function boot() {
      // dynamic import to avoid SSR issues with viem client typing
      const { createPublicClient, http } = await import("viem");
      const { qdayAevum } = await import("@/lib/web3/chain");
      const client = createPublicClient({ chain: qdayAevum, transport: http(qdayAevum.rpcUrls.default.http[0]) });

      const head = await client.getBlockNumber();
      // QDay RPC caps eth_getLogs at 1000 blocks per request — chunk history.
      const from = head > 10000n ? head - 10000n : 0n;
      const STEP = 900n; // stay under the 1000-block cap

      const guardLogs = await fetchLogsChunked(client, GUARD_ABI, GUARD_ADDRESS, from, head, STEP);
      const registryLogs = await fetchLogsChunked(client, REGISTRY_ABI, REGISTRY_ADDRESS, from, head, STEP);
      const mapped = [...mapGuard(guardLogs), ...mapRegistry(registryLogs)];
      if (stop) return;
      setRows((r) => mergeRows(r, mapped, seen.current));

      // live
      const uw1 = client.watchContractEvent({
        abi: GUARD_ABI,
        address: GUARD_ADDRESS,
        onLogs: (logs) => {
          if (stop) return;
          setRows((r) => mergeRows(r, mapGuard(logs as unknown as Log[]), seen.current));
        },
      });
      const uw2 = client.watchContractEvent({
        abi: REGISTRY_ABI,
        address: REGISTRY_ADDRESS,
        onLogs: (logs) => {
          if (stop) return;
          setRows((r) => mergeRows(r, mapRegistry(logs as unknown as Log[]), seen.current));
        },
      });
      unwatchFns = [uw1, uw2];
      setLive(true);
    }

    boot();
    return () => {
      stop = true;
      unwatchFns.forEach((f) => f());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => rows.filter((r) => FILTERS.find((f) => f.id === filter)!.match(r.kind)), [rows, filter]);

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
          {live ? "LIVE — watching chain" : contractsConfigured ? "loading…" : "no contracts configured"}
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
              ? "No events yet — make a payment or run the agent to populate the trail."
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
          {shortHash(row.hash)}
        </p>
      </div>
    </motion.a>
  );
}

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// ---------------------------------------------------------------- mapping

/**
 * Fetch logs over a wide block range in chunks, because public RPCs (QDay included)
 * cap eth_getLogs per-request range (1000 blocks here). Returns concatenated raw logs.
 */
async function fetchLogsChunked(
  client: { getLogs: (p: never) => Promise<Log[]> },
  abi: readonly unknown[],
  address: string,
  from: bigint,
  to: bigint,
  step: bigint
): Promise<Log[]> {
  const out: Log[] = [];
  let start = from;
  while (start <= to) {
    const end = start + step - 1n;
    const toBlock = end > to ? to : end;
    try {
      const chunk = await client.getLogs({
        abi,
        address: address as `0x${string}`,
        fromBlock: start,
        toBlock,
      } as never);
      out.push(...(chunk as unknown as Log[]));
    } catch {
      // skip unreadable chunk rather than failing the whole audit load
    }
    start = toBlock + 1n;
  }
  return out;
}

function mapGuard(logs: Log[]): AuditRow[] {
  const out: AuditRow[] = [];
  for (const l of logs) {
    const any = l as unknown as { eventName?: string; args?: Record<string, unknown> };
    const hash = l.transactionHash ?? "";
    const key = `${hash}-${l.logIndex}`;
    const ts = 0; // block timestamps are fetched lazily via explorer; rows show block
    const block = l.blockNumber ?? 0n;
    const a = any.args ?? {};
    switch (any.eventName) {
      case "GuardCheck":
        out.push({
          key, kind: "check", hash, blockNumber: block, ts,
          title: `CoP check — ${shortAddr(a.payer as string)} → ${shortAddr(a.payee as string)}`,
          detail: `name “${a.expectedName}” · verdict ${a.result} · mode ${a.mode === 1 ? "ENFORCE" : "WARN"}`,
        });
        break;
      case "PaymentExecuted":
        out.push({
          key, kind: "exec", hash, blockNumber: block, ts,
          title: `Payment executed — ${shortAddr(a.payer as string)} → ${shortAddr(a.payee as string)}`,
          detail: `${formatUsd(a.amount as bigint)} tUSD8 · verdict ${a.result} · matched “${a.matchedAs}”`,
        });
        break;
      case "PaymentBlocked":
        out.push({
          key, kind: "blocked", hash, blockNumber: block, ts,
          title: `Payment BLOCKED — ${shortAddr(a.payer as string)} → ${shortAddr(a.payee as string)}`,
          detail: `name “${a.expectedName}” · verdict ${a.result} · reverted, funds never moved`,
        });
        break;
      case "SessionCreated":
        out.push({
          key, kind: "session", hash, blockNumber: block, ts,
          title: `Session #${a.sessionId} created`,
          detail: `owner ${shortAddr(a.owner as string)} · agent ${shortAddr(a.agent as string)} · cap ${formatUsd(a.capTotal as bigint)}`,
        });
        break;
      case "SessionRevoked":
        out.push({
          key, kind: "session", hash, blockNumber: block, ts,
          title: `Session #${a.sessionId} revoked`,
          detail: `owner ${shortAddr(a.owner as string)} — remaining cap is dead`,
        });
        break;
      case "AgentPaymentExecuted":
        out.push({
          key, kind: "agentExec", hash, blockNumber: block, ts,
          title: `Agent payment — session #${a.sessionId}`,
          detail: `${shortAddr(a.agent as string)} paid ${formatUsd(a.amount as bigint)} tUSD8 to ${shortAddr(a.payee as string)} · verdict ${a.result}`,
        });
        break;
      case "AgentPaymentBlocked":
        out.push({
          key, kind: "agentBlocked", hash, blockNumber: block, ts,
          title: `Agent payment BLOCKED — session #${a.sessionId}`,
          detail: `agent ${shortAddr(a.agent as string)} → “${a.expectedName}” verdict ${a.result} · guardrail held`,
        });
        break;
    }
  }
  return out;
}

function mapRegistry(logs: Log[]): AuditRow[] {
  const out: AuditRow[] = [];
  for (const l of logs) {
    const any = l as unknown as { eventName?: string; args?: Record<string, unknown> };
    const hash = l.transactionHash ?? "";
    const key = `${hash}-${l.logIndex}`;
    const block = l.blockNumber ?? 0n;
    const a = any.args ?? {};
    switch (any.eventName) {
      case "PayeeRegistered":
        out.push({
          key, kind: "registry", hash, blockNumber: block, ts: 0,
          title: `Identity registered — ${shortAddr(a.payee as string)}`,
          detail: `display name “${a.displayName}”`,
        });
        break;
      case "PayeeAttested":
        out.push({
          key, kind: "registry", hash, blockNumber: block, ts: 0,
          title: `Attestation — ${shortAddr(a.verifier as string)} endorsed ${shortAddr(a.payee as string)}`,
          detail: `verified name “${a.name}”`,
        });
        break;
      case "AttestationRevoked":
        out.push({
          key, kind: "registry", hash, blockNumber: block, ts: 0,
          title: `Attestation revoked — ${shortAddr(a.verifier as string)} → ${shortAddr(a.payee as string)}`,
          detail: `name “${a.name}”`,
        });
        break;
    }
  }
  return out;
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

void EXPLORER_URL;

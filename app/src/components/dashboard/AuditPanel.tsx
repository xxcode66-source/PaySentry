"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  History,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { shortAddr, timeAgo } from "@/lib/format";
import { GUARD_ADDRESS, REGISTRY_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { txLink } from "@/lib/web3/chain";
import { DEPLOY_BLOCK, FILTERS, KIND_META, VERDICT_PILL, type AuditRow } from "@/lib/audit/trail";
import { useAuditTrail } from "./AuditProvider";

export function AuditPanel() {
  const { rows, live, loading, error, scanned, totalToScan } = useAuditTrail();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [, setNow] = useState(0);

  // Re-render every 30s so "x min ago" stays fresh.
  useEffect(() => {
    const t = setInterval(() => setNow((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);


  const stats = useMemo(() => {
    const payments = rows.filter((r) => r.kind === "exec" || r.kind === "agentExec").length;
    const blocked = rows.filter((r) => r.kind === "blocked" || r.kind === "agentBlocked").length;
    const checks = rows.filter((r) => r.kind === "check").length;
    const registry = rows.filter((r) => r.kind === "registry").length;
    return { total: rows.length, payments, blocked, checks, registry };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!FILTERS.find((f) => f.id === filter)!.match(r.kind)) return false;
      if (!q) return true;
      return `${r.title} ${r.detail} ${r.hash} ${r.verdict ?? ""} ${r.amount ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, filter, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, AuditRow[]>();
    for (const r of visible) {
      const label = r.ts
        ? new Date(r.ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        : `Block ${r.blockNumber.toString()}`;
      const list = groups.get(label) ?? [];
      list.push(r);
      groups.set(label, list);
    }
    return [...groups.entries()];
  }, [visible]);

  const progressPct =
    totalToScan > 0n ? Math.min(100, Math.round((Number(scanned) / Number(totalToScan)) * 100)) : 0;

  function exportCsv() {
    const header = "time,block,kind,verdict,amount,title,detail,tx_hash\n";
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = visible
      .map((r) =>
        [
          r.ts ? new Date(r.ts * 1000).toISOString() : "",
          r.blockNumber.toString(),
          KIND_META[r.kind].label,
          r.verdict ?? "",
          r.amount ?? "",
          r.title,
          r.detail,
          r.hash,
        ]
          .map(esc)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paysentry-audit-trail.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Header — same accent-bar language as the other panels (see kit PanelHeader) */}
      <div className="mb-6 border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-neon-cyan to-neon-violet" />
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-xl font-semibold text-white">Audit trail</h2>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    live
                      ? "border-neon-green/40 bg-neon-green/10 text-neon-green"
                      : "border-white/10 bg-white/[0.03] text-slate-400"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-neon-green" : "bg-slate-500"}`} />
                  {live ? "Live" : loading ? "Syncing" : "Not configured"}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-sm text-slate-400">
                Every check, payment and blocked attempt — replayed straight from chain
                events, since deployment (block {DEPLOY_BLOCK.toString()} · QDay Aevum 44005).
              </p>
            </div>
          </div>
          <button
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-neon-cyan/50 hover:text-neon-cyan disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {/* Summary strip */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard icon={History} label="Total events" value={stats.total} tone="text-slate-100" />
          <StatCard icon={Receipt} label="Payments" value={stats.payments} tone="text-neon-green" />
          <StatCard icon={ShieldAlert} label="Blocked" value={stats.blocked} tone="text-neon-red" />
          <StatCard icon={FileSearch} label="CoP checks" value={stats.checks} tone="text-neon-cyan" />
        </div>
      </div>

      {loading && totalToScan > 0n && (
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-300">Syncing on-chain history…</p>
            <p className="font-mono text-xs text-slate-400">{progressPct}%</p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-violet transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-slate-500">
            {scanned.toString()} / {totalToScan.toString()} blocks · from deployment block {DEPLOY_BLOCK.toString()}
          </p>
        </div>
      )}

      {loading && totalToScan === 0n && (
        <div className="mb-5 space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass animate-pulse rounded-2xl p-4">
              <div className="h-4 w-2/3 rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-neon-red/30 bg-neon-red/[0.06] p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-neon-red" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Toolbar: search + filters with counts */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search address, name, tx hash…"
            className="w-full rounded-xl border border-white/10 bg-ink-800/70 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-neon-cyan/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count =
              f.id === "all"
                ? rows.length
                : rows.filter((r) => f.match(r.kind)).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  filter === f.id
                    ? "border-neon-cyan/60 bg-neon-cyan/10 text-neon-cyan"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    filter === f.id ? "bg-neon-cyan/20 text-neon-cyan" : "bg-white/5 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline, grouped by day */}
      <div>
        {visible.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">
              {query ? "No events match your search." : "No events yet"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
              {contractsConfigured
                ? loading
                  ? "Scanning the chain for events…"
                  : error
                    ? "Could not load the audit trail — see the error above."
                    : "No events since deployment (block 3931234) — make a payment or run the agent to populate the trail. Note: a payment that reverts (e.g. blocked by the guard) leaves no event log, only a failed transaction."
                : "Configure deployed contracts to stream audit events."}
            </p>
          </div>
        )}
        {grouped.map(([dateLabel, items]) => (
          <div key={dateLabel} className="relative">
            <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 bg-ink/80 py-2 backdrop-blur">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{dateLabel}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                {items.length} {items.length === 1 ? "event" : "events"}
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <div className="relative ml-[19px] border-l border-white/10 pl-5">
              {items.map((r, i) => (
                <AuditItem key={r.key} row={r} isLast={i === items.length - 1} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {visible.length > 0 && (
        <p className="mt-5 text-center text-[11px] text-slate-600">
          Showing {visible.length} of {rows.length} events · Source: QDay Aevum RPC · Contracts{" "}
          {shortAddr(GUARD_ADDRESS)} / {shortAddr(REGISTRY_ADDRESS)}
        </p>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Receipt;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
      </div>
      <p className={`mt-1.5 font-display text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function AuditItem({ row, isLast }: { row: AuditRow; isLast?: boolean }) {
  const meta = KIND_META[row.kind];
  const Icon = meta.icon;
  const isBlocked = row.kind === "blocked" || row.kind === "agentBlocked";
  const [copied, setCopied] = useState(false);
  const timeLabel = row.ts
    ? new Date(row.ts * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

  function copyHash(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(row.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative pb-3 ${isLast ? "" : ""}`}
    >
      {/* Timeline node */}
      <span
        className={`absolute -left-[27px] top-4 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-ink-900 ${
          meta.tone === "ok"
            ? "bg-neon-green"
            : meta.tone === "bad"
              ? "bg-neon-red"
              : meta.tone === "info"
                ? "bg-neon-cyan"
                : meta.tone === "warn"
                  ? "bg-neon-violet"
                  : "bg-slate-500"
        }`}
      />
      <a
        href={txLink(row.hash)}
        target="_blank"
        rel="noreferrer"
        className={`group block rounded-2xl border p-4 transition-all hover:-translate-y-px hover:shadow-lg ${
          isBlocked
            ? "border-neon-red/30 bg-neon-red/[0.04] hover:border-neon-red/50"
            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <span className={`mt-0.5 shrink-0 rounded-xl p-2.5 ring-1 ${meta.cls}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-100">{row.title}</p>
              {row.verdict && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                    VERDICT_PILL[row.verdict] ?? "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  {row.verdict === "FULL MATCH" && <ShieldCheck className="h-3 w-3" />}
                  {row.verdict === "NO MATCH" && <ShieldAlert className="h-3 w-3" />}
                  {row.verdict}
                </span>
              )}
              <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                {meta.label}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{row.detail}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="font-mono">#{row.blockNumber.toString()}</span>
              </span>
              <span>
                {timeLabel ? `${timeLabel} · ${timeAgo(row.ts)}` : timeAgo(row.ts)}
              </span>
              <button
                onClick={copyHash}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-slate-500 transition hover:bg-white/5 hover:text-neon-cyan"
                title="Copy transaction hash"
              >
                {copied ? <Check className="h-3 w-3 text-neon-green" /> : <Copy className="h-3 w-3" />}
                {row.hash.slice(0, 10)}…{row.hash.slice(-6)}
              </button>
              <span className="inline-flex items-center gap-1 text-slate-600 transition group-hover:text-neon-cyan">
                Explorer <ExternalLink className="h-3 w-3" />
              </span>
            </div>
          </div>
          {row.amount && (
            <div className="shrink-0 text-right">
              <p className="font-display text-base font-semibold tabular-nums text-white">{row.amount}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">tUSD8</p>
            </div>
          )}
        </div>
      </a>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FileSearch,
  Fingerprint,
  History,
  Receipt,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { LevelBadge, PanelHeader } from "@/components/ui/kit";
import { formatUsd, timeAgo } from "@/lib/format";
import { ERC20_ABI, REGISTRY_ABI } from "@/lib/web3/abis";
import { REGISTRY_ADDRESS, TUSD8_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { addressLink, txLink } from "@/lib/web3/chain";
import { KIND_META } from "@/lib/audit/trail";
import { useAuditTrail } from "./AuditProvider";

/** Dashboard home: wallet summary — address, identity status, balances. */
export function HomePanel() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  const valid = !!address && isAddress(address);
  const addr = address ?? undefined;

  const { data: identity, refetch: refetchIdentity } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "payeeOf",
    args: [addr as `0x${string}`],
    query: { enabled: contractsConfigured && valid, refetchInterval: 6000 },
  });
  const { data: tusd8, refetch: refetchTusd8 } = useContractRead({
    abi: ERC20_ABI,
    address: TUSD8_ADDRESS,
    functionName: "balanceOf",
    args: [addr as `0x${string}`],
    query: { enabled: contractsConfigured && valid, refetchInterval: 6000 },
  });
  const { data: tqday, refetch: refetchTqday } = useBalance({
    address: addr,
    query: { enabled: contractsConfigured && valid, refetchInterval: 6000 },
  });

  void tick;

  const registered = identity ? Boolean(identity[1]) : false;
  const displayName = identity?.[0] ?? "";
  const level = identity ? Number(identity[2]) : undefined;

  const refresh = () => {
    refetchIdentity();
    refetchTusd8();
    refetchTqday();
    setTick((x) => x + 1);
  };

  return (
    <div>
      <PanelHeader
        title="Overview"
        desc="Your wallet, identity and balances — all straight from the chain."
      />

      {/* address card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet text-ink">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Connected wallet
              </p>
              <p className="font-mono text-sm text-slate-200">
                {isConnected && addr ? addr : "Not connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (addr) {
                  navigator.clipboard.writeText(addr);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
              disabled={!addr}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan disabled:opacity-40"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-neon-green" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy address"}
            </button>
            {addr && (
              <a
                href={addressLink(addr)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:text-neon-cyan"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Explorer
              </a>
            )}
            <button
              onClick={refresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:text-neon-cyan"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* identity status */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          {contractsConfigured && valid ? (
            registered ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-neon-green" />
                <p className="text-sm text-slate-300">
                  Registered as <span className="font-semibold text-white">“{displayName}”</span>
                </p>
                {level !== undefined && <LevelBadge level={level} />}
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 text-neon-amber" />
                <p className="text-sm text-slate-300">
                  Not registered yet — claim an identity in the <span className="text-neon-cyan">Registry</span> tab.
                </p>
              </>
            )
          ) : (
            <>
              <Circle className="h-4 w-4 text-slate-500" />
              <p className="text-sm text-slate-500">Connect a wallet to see your identity status.</p>
            </>
          )}
        </div>
      </motion.div>

      {/* balances */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <BalanceCard
          label="tQDAY"
          desc="Gas · native"
          value={tqday?.value ?? 0n}
          decimals={18}
          accent="violet"
        />
        <BalanceCard
          label="tUSD8"
          desc="Stablecoin · ERC-20"
          value={tusd8 ?? 0n}
          decimals={6}
          accent="cyan"
        />
      </div>

      {/* Live activity — same on-chain trail as the Audit tab */}
      <OverviewActivity />

      {/* Quick actions */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/dashboard?tab=verify"
          icon={FileSearch}
          title="Verify a payee"
          desc="Run a CoP check before you pay"
        />
        <QuickAction
          href="/dashboard?tab=pay"
          icon={Send}
          title="Guarded payment"
          desc="Send tUSD8 through the guard"
        />
        <QuickAction
          href="/dashboard?tab=registry&prefill=register"
          icon={Fingerprint}
          title="Register identity"
          desc="Claim your name on-chain"
        />
      </div>

      {!contractsConfigured && (
        <p className="mt-4 text-xs text-slate-500">
          Deploy the contracts and set <code className="font-mono">NEXT_PUBLIC_*</code> addresses to load live balances.
        </p>
      )}
    </div>
  );
}

function OverviewActivity() {
  const { rows, live, loading } = useAuditTrail();
  const stats = useMemo(() => {
    return {
      total: rows.length,
      payments: rows.filter((r) => r.kind === "exec" || r.kind === "agentExec").length,
      blocked: rows.filter((r) => r.kind === "blocked" || r.kind === "agentBlocked").length,
      checks: rows.filter((r) => r.kind === "check").length,
    };
  }, [rows]);
  const recent = rows.slice(0, 5);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-white">Network activity</h3>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-neon-green" : "bg-slate-500"}`} />
          {live ? "Live from chain" : loading ? "Syncing…" : "Not synced"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MiniStat icon={History} label="Total events" value={stats.total} />
        <MiniStat icon={Receipt} label="Payments" value={stats.payments} tone="text-neon-green" />
        <MiniStat icon={ShieldAlert} label="Blocked" value={stats.blocked} tone="text-neon-red" />
        <MiniStat icon={FileSearch} label="CoP checks" value={stats.checks} tone="text-neon-cyan" />
      </div>

      <div className="glass mt-3 divide-y divide-white/5 rounded-2xl">
        {recent.length === 0 && (
          <p className="p-4 text-center text-xs text-slate-500">
            {loading ? "Syncing on-chain history…" : "No events yet — make a payment or run the agent."}
          </p>
        )}
        {recent.map((r) => {
          const meta = KIND_META[r.kind];
          const Icon = meta.icon;
          return (
            <a
              key={r.key}
              href={txLink(r.hash)}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]"
            >
              <span className={`shrink-0 rounded-lg p-2 ${meta.cls}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-200">{r.title}</span>
                <span className="block text-[11px] text-slate-500">
                  {meta.label} · {r.ts ? timeAgo(r.ts) : `block ${r.blockNumber.toString()}`}
                </span>
              </span>
              {r.amount && (
                <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-white">
                  {r.amount}
                </span>
              )}
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-neon-cyan" />
            </a>
          );
        })}
        {recent.length > 0 && (
          <Link
            href="/dashboard?tab=audit"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-neon-cyan transition hover:bg-white/[0.03]"
          >
            View full audit trail <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone = "text-slate-100",
}: {
  icon: typeof Receipt;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p>
      </div>
      <p className={`mt-1 font-display text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Receipt;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-px hover:border-neon-cyan/40"
    >
      <span className="rounded-xl bg-neon-cyan/10 p-2.5 text-neon-cyan ring-1 ring-neon-cyan/20">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-[11px] text-slate-500">{desc}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-neon-cyan" />
    </Link>
  );
}

function BalanceCard({
  label,
  desc,
  value,
  decimals,
  accent,
}: {
  label: string;
  desc: string;
  value: bigint;
  decimals: number;
  accent: "cyan" | "violet";
}) {
  const accentCls =
    accent === "cyan"
      ? "from-neon-cyan/15 to-transparent border-neon-cyan/30"
      : "from-neon-violet/15 to-transparent border-neon-violet/30";
  const valueStr = formatToken(value, decimals);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className={`rounded-2xl border bg-gradient-to-br p-5 transition hover:brightness-110 ${accentCls}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
      <p className="mt-2 font-mono text-2xl font-bold text-white">{valueStr}</p>
    </motion.div>
  );
}

function formatToken(value: bigint, decimals: number): string {
  if (!value) return "0";
  const v = Number(value) / Math.pow(10, decimals);
  return v >= 1 ? v.toFixed(2) : v.toFixed(4);
}

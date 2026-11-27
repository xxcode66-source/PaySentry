"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FileSearch,
  Fingerprint,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { LevelBadge, PanelHeader } from "@/components/ui/kit";
import { shortAddr } from "@/lib/format";
import { ERC20_ABI, REGISTRY_ABI } from "@/lib/web3/abis";
import { REGISTRY_ADDRESS, TUSD8_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { addressLink } from "@/lib/web3/chain";

/** Dashboard home: identity card + asset portfolio.
 *  No new network calls — only the identity + balance reads this panel
 *  already made (payeeOf, balanceOf, native balance). */
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
  const attCount = identity ? Number(identity[3]) : undefined;

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
        desc="Your identity card and assets — all straight from the chain."
      />

      {/* Identity card — like a name card / ID card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neon-cyan/15 via-ink-800 to-neon-violet/15 p-6 sm:p-7"
      >
        {/* decorative rings, like a card watermark */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[22px] border-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-20 -right-4 h-40 w-40 rounded-full border-[18px] border-neon-violet/10" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* avatar */}
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-bold ${
                  registered
                    ? "bg-gradient-to-br from-neon-cyan to-neon-violet text-ink shadow-glow-cyan"
                    : "border-2 border-dashed border-white/20 bg-white/5 text-slate-400"
                }`}
              >
                {registered ? (
                  displayName.charAt(0).toUpperCase()
                ) : (
                  <Fingerprint className="h-7 w-7" />
                )}
              </div>
              <div>
                {isConnected && addr ? (
                  registered ? (
                    <>
                      <p className="font-display text-2xl font-semibold leading-tight text-white">
                        {displayName}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{addr}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-2xl font-semibold leading-tight text-white">
                        Belum terdaftar
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{addr}</p>
                    </>
                  )
                ) : (
                  <>
                    <p className="font-display text-2xl font-semibold leading-tight text-white">
                      PaySentry Identity
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Connect your wallet to see your identity card.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* status chip */}
            {isConnected && addr && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  registered
                    ? "border-neon-green/40 bg-neon-green/10 text-neon-green"
                    : "border-neon-amber/40 bg-neon-amber/10 text-neon-amber"
                }`}
              >
                {registered ? (
                  <>
                    <BadgeCheck className="h-3.5 w-3.5" /> Terdaftar
                  </>
                ) : (
                  <>
                    <Circle className="h-3.5 w-3.5" /> Belum terdaftar
                  </>
                )}
              </span>
            )}
          </div>

          {/* card footer */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs">
            {isConnected && addr ? (
              registered ? (
                <>
                  {level !== undefined && (
                    <span className="flex items-center gap-2">
                      <span className="text-slate-500">Trust level</span>
                      <LevelBadge level={level} />
                    </span>
                  )}
                  <span className="text-slate-400">
                    <span className="text-slate-500">Attestations · </span>
                    {attCount ?? 0}
                  </span>
                  <span className="text-slate-400">
                    <span className="text-slate-500">Network · </span>
                    QDay Aevum
                  </span>
                </>
              ) : (
                <span className="max-w-md leading-relaxed text-slate-400">
                  Alamat ini belum punya nama di Registry — pembayaran ke alamat ini
                  akan gagal di mode Enforce sampai identitas didaftarkan.
                </span>
              )
            ) : (
              <span className="text-slate-500">No wallet connected.</span>
            )}

            <span className="ml-auto flex items-center gap-2">
              {addr && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(addr);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-neon-green" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy address"}
                  </button>
                  <a
                    href={addressLink(addr)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:text-neon-cyan"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Explorer
                  </a>
                </>
              )}
              {isConnected && addr && !registered && (
                <Link
                  href="/dashboard?tab=registry&prefill=register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-violet px-3 py-1.5 text-xs font-semibold text-ink transition hover:brightness-110"
                >
                  Daftarkan identitas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Assets — fintech-style portfolio */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-500" />
            <h3 className="font-display text-sm font-semibold text-white">Your assets</h3>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
              2 tokens · QDay Aevum
            </span>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:text-neon-cyan"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AssetCard
            symbol="tQDAY"
            name="QDay Token"
            desc="Gas · native token"
            value={tqday?.value ?? 0n}
            decimals={18}
            accent="violet"
            tokenAddr={null}
          />
          <AssetCard
            symbol="tUSD8"
            name="Test USD"
            desc="Stablecoin · ERC-20"
            value={tusd8 ?? 0n}
            decimals={6}
            accent="cyan"
            tokenAddr={TUSD8_ADDRESS}
          />
        </div>
      </div>

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

function AssetCard({
  symbol,
  name,
  desc,
  value,
  decimals,
  accent,
  tokenAddr,
}: {
  symbol: string;
  name: string;
  desc: string;
  value: bigint;
  decimals: number;
  accent: "cyan" | "violet";
  tokenAddr: string | null;
}) {
  const valueStr = formatToken(value, decimals);
  const isCyan = accent === "cyan";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className={`group relative overflow-hidden rounded-3xl border bg-ink-800/60 p-6 transition hover:-translate-y-px ${
        isCyan ? "border-neon-cyan/20 hover:border-neon-cyan/40" : "border-neon-violet/20 hover:border-neon-violet/40"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl ${
          isCyan ? "bg-neon-cyan/15" : "bg-neon-violet/20"
        }`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold ring-1 ${
                isCyan
                  ? "bg-neon-cyan/15 text-neon-cyan ring-neon-cyan/30"
                  : "bg-neon-violet/15 text-neon-violet ring-neon-violet/30"
              }`}
            >
              {symbol.charAt(0)}
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{symbol}</p>
              <p className="text-[11px] text-slate-500">
                {name} · {desc}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Available
          </span>
        </div>
        <p className="mt-5 font-display text-4xl font-semibold tabular-nums tracking-tight text-white">
          {valueStr}
          <span className="ml-2 text-base font-medium text-slate-500">{symbol}</span>
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-slate-500">
          <span>Balance on QDay Aevum</span>
          {tokenAddr && <span className="font-mono">{shortAddr(tokenAddr, 6)}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof FileSearch;
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

function formatToken(value: bigint, decimals: number): string {
  if (!value) return "0.00";
  const v = Number(value) / Math.pow(10, decimals);
  return v >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v.toFixed(2);
}

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
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { PanelHeader } from "@/components/ui/kit";
import { TiltCard } from "@/components/shared/TiltCard";
import { MiniShield } from "@/components/three/MiniShield";
import { WalletButton } from "@/components/shared/WalletButton";
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

      {/* Identity card — like a name card / ID card, with 3D tilt + glare */}
      <TiltCard max={10} className="rounded-3xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="animate-gradient-pan relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neon-cyan/15 via-ink-800 to-neon-cyan/15 bg-[length:200%_200%] p-6 sm:p-7"
      >
        {/* light sweep across the card, every few seconds */}
        <div className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        {/* decorative rings, like a card watermark */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[22px] border-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-20 -right-4 h-40 w-40 rounded-full border-[18px] border-neon-cyan/10" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* avatar — a self-animating 3D shield, never a letter initial */}
              <div
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 ${
                  registered ? "bg-neon-cyan/10 shadow-glow-cyan" : "bg-white/5"
                }`}
              >
                <MiniShield dimmed={!registered} />
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
                        Not registered
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">{addr}</p>
                    </>
                  )
                ) : (
                  <>
                    <p className="font-display text-2xl font-semibold leading-tight text-white">
                      PaySentry Identity
                    </p>
                    <p className="mt-0.5 text-xs text-slate-300">
                      Connect your wallet to see your identity card.
                    </p>
                    {/* Sample preview — grayscale + labeled header so it reads
                        as a placeholder example, never as your own identity */}
                    <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-ink-900/50 px-3 py-2.5 opacity-75 grayscale">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Sample identity
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-300">
                            “au”
                          </span>
                          <span className="block font-mono text-[11px] text-slate-500">
                            0x9f25…ef94 · 1 tUSD8 · 24 Nov 2026
                          </span>
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        A real on-chain identity, shown as an example.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* status chip */}
            {isConnected && addr && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.15 }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  registered
                    ? "border-neon-green/40 bg-neon-green/10 text-neon-green"
                    : "border-neon-amber/40 bg-neon-amber/10 text-neon-amber"
                }`}
              >
                {registered ? (
                  <>
                    <BadgeCheck className="h-3.5 w-3.5" /> Registered
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-amber opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-amber" />
                    </span>
                    Not registered
                  </>
                )}
              </motion.span>
            )}
          </div>

          {/* card footer */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs">
            {isConnected && addr ? (
              registered ? (
                <>
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
                  This address has no name in the Registry yet — payments to it
                  will fail in Enforce mode until an identity is registered.
                </span>
              )
            ) : (
              <span className="flex flex-wrap items-center gap-3">
                <WalletButton compact />
                <span className="text-slate-400">
                  Your card, balances and activity appear here once connected.
                </span>
              </span>
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
                  className="relative inline-flex items-center gap-1.5 rounded-lg bg-neon-cyan px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-cyan-300"
                >
                  <span className="absolute inset-0 animate-ping rounded-lg bg-neon-cyan/30 [animation-duration:2.5s]" />
                  <span className="relative flex items-center gap-1.5">
                    Register identity <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              )}
            </span>
          </div>
        </div>
      </motion.div>
      </TiltCard>

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
            glyph="Q"
            name="QDay Token"
            desc="Gas · native token"
            value={tqday?.value ?? 0n}
            decimals={18}
            tokenAddr={null}
            tokenAddrLabel="Token contract"
            delay={0.08}
          />
          <AssetCard
            symbol="tUSD8"
            glyph="$"
            name="Test USD"
            desc="Stablecoin · ERC-20"
            value={tusd8 ?? 0n}
            decimals={6}
            tokenAddr={TUSD8_ADDRESS}
            tokenAddrLabel="Token contract"
            delay={0.16}
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

/** Eased count-up for balances — numbers roll up on load instead of popping in. */
function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

function AssetCard({
  symbol,
  glyph,
  name,
  desc,
  value,
  decimals,
  tokenAddr,
  tokenAddrLabel,
  delay = 0,
}: {
  symbol: string;
  glyph: string;
  name: string;
  desc: string;
  value: bigint;
  decimals: number;
  tokenAddr: string | null;
  tokenAddrLabel: string;
  delay?: number;
}) {
  const numeric = Number(value) / Math.pow(10, decimals);
  const animated = useCountUp(numeric);
  const valueStr = formatNumber(animated);
  return (
    <TiltCard max={6} className="h-full rounded-3xl">
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group relative h-full overflow-hidden rounded-3xl border border-neon-cyan/20 bg-ink-800/60 p-6 transition hover:-translate-y-px hover:border-neon-cyan/40"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-neon-cyan/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neon-cyan/15 font-display text-base font-bold text-neon-cyan ring-1 ring-neon-cyan/30">
              {glyph}
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
          <span>{tokenAddrLabel}</span>
          {tokenAddr ? (
            <span className="font-mono">{shortAddr(tokenAddr, 6)}</span>
          ) : (
            <span>Native token</span>
          )}
        </div>
      </div>
    </motion.div>
    </TiltCard>
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

function formatNumber(v: number): string {
  if (!v) return "0.00";
  return v >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v.toFixed(2);
}

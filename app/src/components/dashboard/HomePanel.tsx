"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Copy, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { isAddress } from "viem";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { LevelBadge, PanelHeader } from "@/components/ui/kit";
import { formatUsd } from "@/lib/format";
import { ERC20_ABI, REGISTRY_ABI } from "@/lib/web3/abis";
import { REGISTRY_ADDRESS, TUSD8_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { addressLink } from "@/lib/web3/chain";

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

      {!contractsConfigured && (
        <p className="mt-4 text-xs text-slate-500">
          Deploy the contracts and set <code className="font-mono">NEXT_PUBLIC_*</code> addresses to load live balances.
        </p>
      )}
    </div>
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

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Fingerprint, History, Search, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ContractsMissingBanner, FaucetChip, WrongNetworkBanner } from "@/components/shared/Banners";
import { Logo } from "@/components/landing/Nav";
import { AuditPanel } from "./AuditPanel";
import { PayPanel } from "./PayPanel";
import { RegistryPanel } from "./RegistryPanel";
import { SessionsPanel } from "./SessionsPanel";
import { VerifyPanel } from "./VerifyPanel";

const TABS = [
  { id: "verify", label: "Verify", icon: Search, desc: "run a CoP check" },
  { id: "pay", label: "Pay", icon: Send, desc: "guarded payment" },
  { id: "sessions", label: "Sessions", icon: Bot, desc: "agent guardrails" },
  { id: "registry", label: "Registry", icon: Fingerprint, desc: "identities" },
  { id: "audit", label: "Audit", icon: History, desc: "on-chain trail" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DashboardShell() {
  const params = useSearchParams();
  const { address, isConnected } = useAccount();
  const initialTab = (params.get("tab") as TabId) || "verify";
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : "verify");

  const prefill = {
    address: params.get("address") ?? undefined,
    name: params.get("name") ?? undefined,
  };
  const registryPrefill = params.get("prefill") ?? undefined;

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-40 border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="transition hover:opacity-85">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <FaucetChip address={address} />
            <Link href="/demo" className="text-xs text-slate-400 transition hover:text-neon-cyan">
              Guided demo →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            <span className="text-gradient">PaySentry</span> console
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            QDay Aevum Testnet · tUSD8 · zero backend — everything you see is on-chain.
          </p>
        </div>

        <WrongNetworkBanner visible={isConnected} />
        <ContractsMissingBanner />

        {/* Tab bar */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                tab === t.id
                  ? "border-neon-cyan/50 bg-neon-cyan/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <t.icon className={`h-4 w-4 ${tab === t.id ? "text-neon-cyan" : "text-slate-500"}`} />
              <p className={`mt-2 text-sm font-semibold ${tab === t.id ? "text-white" : "text-slate-300"}`}>
                {t.label}
              </p>
              <p className="text-[10px] text-slate-500">{t.desc}</p>
              {tab === t.id && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-neon-cyan to-neon-violet"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {tab === "verify" && <VerifyPanel prefill={prefill} />}
            {tab === "pay" && <PayPanel prefill={prefill} />}
            {tab === "sessions" && <SessionsPanel />}
            {tab === "registry" && <RegistryPanel prefill={registryPrefill} />}
            {tab === "audit" && <AuditPanel />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

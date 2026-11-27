"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, Fingerprint, History, Home, Search, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ContractsMissingBanner, FaucetChip, WrongNetworkBanner } from "@/components/shared/Banners";
import { WalletButton } from "@/components/shared/WalletButton";
import { Logo } from "@/components/landing/Nav";
import { shortAddr } from "@/lib/format";
import { GUARD_ADDRESS, REGISTRY_ADDRESS } from "@/lib/web3/addresses";
import { AuditProvider } from "./AuditProvider";
import { AuditPanel } from "./AuditPanel";
import { HomePanel } from "./HomePanel";
import { PayPanel } from "./PayPanel";
import { RegistryPanel } from "./RegistryPanel";
import { SessionsPanel } from "./SessionsPanel";
import { VerifyPanel } from "./VerifyPanel";

const TABS = [
  { id: "home", label: "Overview", icon: Home, desc: "wallet & balances" },
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
  const initialTab = (params.get("tab") as TabId) || "home";
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : "home");

  // Deep-linking: /dashboard?tab=pay&address=…&name=… (e.g. Verify → Pay,
  // Pay receipt → Audit) switches the tab even after the shell has mounted.
  useEffect(() => {
    const t = params.get("tab") as TabId;
    if (t && TABS.some((x) => x.id === t)) setTab(t);
  }, [params]);

  const prefill = {
    address: params.get("address") ?? undefined,
    name: params.get("name") ?? undefined,
  };
  const registryPrefill = params.get("prefill") ?? undefined;

  return (
    <div className="min-h-screen">
      {/* top bar (mobile) */}
      <header className="glass-strong sticky top-0 z-40 border-b border-white/5 lg:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="transition hover:opacity-85">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <FaucetChip address={address} />
            <WalletButton compact />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-ink-900/80 via-transparent to-transparent px-4 py-6 lg:flex">
          <Link href="/" className="mb-8 px-2 transition hover:opacity-85">
            <Logo />
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                  tab === t.id
                    ? "bg-gradient-to-r from-neon-cyan/15 via-neon-violet/10 to-transparent text-white shadow-glow-cyan"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="side-active"
                    className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-neon-cyan to-neon-violet shadow-glow-cyan"
                  />
                )}
                <t.icon className={`h-4 w-4 ${tab === t.id ? "text-neon-cyan" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${tab === t.id ? "text-white" : ""}`}>{t.label}</span>
                  <span className="block text-[10px] text-slate-500">{t.desc}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="mb-3 [&_button]:w-full [&_button]:justify-center">
              <WalletButton />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Network</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-neon-green">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green" />
                </span>
                QDay Aevum · 44005
              </p>
            </div>
            <a
              href="/demo"
              className="mt-3 block rounded-xl border border-neon-violet/30 bg-neon-violet/10 px-3 py-2.5 text-center text-xs font-medium text-neon-violet transition hover:bg-neon-violet/20"
            >
              Guided demo →
            </a>
          </div>
        </aside>

        {/* main content */}
        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16">
          <div className="mx-auto max-w-5xl">
            <WrongNetworkBanner visible={isConnected} />
            <ContractsMissingBanner />

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                {tab === "home" && <HomePanel />}
                {tab === "verify" && <VerifyPanel prefill={prefill} />}
                {tab === "pay" && <PayPanel prefill={prefill} />}
                {tab === "sessions" && <SessionsPanel />}
                {tab === "registry" && <RegistryPanel prefill={registryPrefill} />}
                {/* The audit scan (hundreds of eth_getLogs calls) runs only here,
                    when the user actually opens the Audit tab — no chain scan
                    on dashboard load, and no new network calls anywhere else. */}
                {tab === "audit" && (
                  <AuditProvider>
                    <AuditPanel />
                  </AuditProvider>
                )}
              </motion.div>
            </AnimatePresence>

              {/* Status footer — same source of truth on every tab */}
              <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-4 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon-green" />
                  QDay Aevum · chain 44005
                </span>
                <span>
                  Guard <span className="font-mono text-slate-400">{shortAddr(GUARD_ADDRESS)}</span>
                </span>
                <span>
                  Registry <span className="font-mono text-slate-400">{shortAddr(REGISTRY_ADDRESS)}</span>
                </span>
                <span className="ml-auto">Audit data replayed from on-chain events since block 3931234</span>
              </footer>
          </div>
        </main>
      </div>

      {/* bottom nav (mobile) */}
      <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-white/10 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1 py-2.5 transition ${
                tab === t.id ? "text-neon-cyan" : "text-slate-500"
              }`}
            >
              <t.icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
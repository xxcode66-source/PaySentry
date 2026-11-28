"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, CircleDashed, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useContractRead } from "wagmi";
import { Button, CopyButton, VerdictPill } from "@/components/ui/kit";
import { Logo } from "@/components/landing/Nav";
import { predictCheck } from "@/lib/cop/simulate";
import { REGISTRY_ABI } from "@/lib/web3/abis";
import { REGISTRY_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { qdayAevum } from "@/lib/web3/chain";

const DEMO_PAYEE = ""; // user pastes or uses their own wallet in step 2

interface Step {
  id: number;
  title: string;
  why: string;
}

const STEPS: Step[] = [
  { id: 1, title: "Setup — wallet, network, test tokens", why: "Everything runs on QDay Aevum Testnet (chain 44005) with tUSD8. Grab faucet tokens for 3–4 addresses: payer, payee, attacker (and optionally a dedicated agent key)." },
  { id: 2, title: "Register a payee identity", why: "The payee self-claims a display name on-chain. This becomes the reference for name checks." },
  { id: 3, title: "Attest it (verifier level)", why: "You are the registry's first verifier after deploying. Attesting raises the identity to ATTESTED trust level — like a bank confirming the account holder's name." },
  { id: 4, title: "Verify — the happy path", why: "Run a Confirmation-of-Payee check: the name you intend to pay vs the on-chain identity. FULL MATCH means safe to proceed." },
  { id: 5, title: "Create a bounded agent session", why: "Give an agent a scoped session: per-tx limit, lifetime cap, expiry. Limits are enforced by the contract — the agent physically cannot overspend." },
  { id: 6, title: "The scam attempt — blocked on-chain", why: "Instruct the agent to pay an impostor name. The guard reverts the transaction before any token moves, and the blocked attempt is permanently on the audit trail." },
];

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const netOk = isConnected && chainId === qdayAevum.id;

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-40 border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="transition hover:opacity-85"><Logo /></Link>
          <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-[11px] font-medium text-neon-cyan">
            Demo Day script · ~4 minutes
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-white">
          Guided demo — <span className="text-gradient">from scam to safe</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Six steps that showcase every judging criterion: registration, attestation, verification,
          bounded agents, and the guardrail that blocks a fraudulent payment on-chain. Each step
          links into the console pre-filled where it makes sense.
        </p>

        {/* progress */}
        <div className="mt-8 flex items-center gap-1.5">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className="group relative flex-1"
              aria-label={`Go to step ${s.id}`}
            >
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s.id < step ? "bg-neon-green" : s.id === step ? "bg-gradient-to-r from-neon-cyan to-neon-cyan" : "bg-white/10"
                }`}
              />
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <div className="glass rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="font-display rounded-xl bg-gradient-to-br from-neon-cyan to-neon-cyan px-3 py-1.5 text-sm font-bold text-ink">
                  {step}/6
                </span>
                <h2 className="font-display text-xl font-semibold text-white">{STEPS[step - 1].title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{STEPS[step - 1].why}</p>
              <div className="mt-6">
                {step === 1 && <StepOne netOk={netOk} />}
                {step === 2 && <StepLinkRow href="/dashboard?tab=registry&prefill=register" label="Open Registry tab → claim a name" />}
                {step === 3 && <StepLinkRow href="/dashboard?tab=registry&prefill=attest" label="Open Registry tab → attest the identity" />}
                {step === 4 && <StepFour />}
                {step === 5 && <StepFive />}
                {step === 6 && <StepSix />}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* nav */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            ← Back
          </Button>
          {step < 6 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Next step <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setStep(1)}>
              <CheckCircle2 className="h-4 w-4" /> Replay demo
            </Button>
          )}
        </div>
        {step === 6 && <CompletionCard />}
      </main>
    </div>
  );
}

function StepOne({ netOk }: { netOk: boolean }) {
  return (
    <div className="grid gap-3">
      <CheckRow ok={netOk} label="Wallet connected on QDay Aevum Testnet (44005)" />
      {!netOk && (
        <Link href="/dashboard" className="text-sm text-neon-cyan hover:underline">
          Open the console to connect & switch network →
        </Link>
      )}
      <a
        href="https://faucet.qday.info/en"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-neon-cyan hover:underline"
      >
        Faucet — get tQDAY gas + tUSD8 <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <p className="text-xs text-slate-500">
        Tip: claim faucet for every demo address now (the faucet has a cooldown).
      </p>
    </div>
  );
}

function StepLinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2.5 text-sm font-medium text-neon-cyan transition hover:bg-neon-cyan/20"
    >
      {label} <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function StepFour() {
  const { address } = useAccount();
  const [payee, setPayee] = useState(DEMO_PAYEE);
  const [name, setName] = useState("Your Name here");

  const { data: identity } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "payeeOf",
    args: [payee as `0x${string}`],
    query: {
      enabled: contractsConfigured && payee.length === 42 && payee.startsWith("0x"),
    },
  });
  const displayName = identity?.[0] ?? "";
  const predicted = useMemo(() => predictCheck(displayName ? [displayName] : [], name), [displayName, name]);

  const onChain = contractsConfigured && payee.length === 42 && name.trim().length > 0;
  const result = onChain && displayName ? predicted.result : payee && name.trim() ? predicted.result : undefined;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          placeholder="0x… payee address (step 2 wallet)"
          spellCheck={false}
          className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-neon-cyan/60"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-neon-cyan/60"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <VerdictPill result={result} size="lg" />
        {displayName && <span className="text-xs text-slate-400">registry: “{displayName}”</span>}
        {!address && <span className="text-xs text-slate-500">connect wallet for full flow</span>}
      </div>
      <StepLinkRow href="/dashboard?tab=verify" label="Open full Verify tab" />
      <p className="text-xs text-slate-500">
        Try the typo: change the last character of the name — the verdict should drop to CLOSE MATCH.
      </p>
    </div>
  );
}

function StepFive() {
  const cmd = `cd app\nexport AGENT_PRIVATE_KEY=0x<agent key>\nexport GUARD_ADDRESS=0x<guard>\nexport REGISTRY_ADDRESS=0x<registry>\nnode scripts/agent.mjs inspect --session 0\nnode scripts/agent.mjs pay --session 0 --payee 0x<PAYEE> --name "Your Name here" --amount 2`;
  return (
    <div className="grid gap-4">
      <StepLinkRow href="/dashboard?tab=sessions" label="Open Sessions tab → create a bounded session" />
      <div>
        <p className="mb-2 text-xs text-slate-400">Agent CLI — the “autonomous worker” of the demo:</p>
        <div className="relative rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
          <CopyButton text={cmd} label="Copy" />
          <pre className="mt-2 whitespace-pre-wrap">{cmd}</pre>
        </div>
      </div>
    </div>
  );
}

function StepSix() {
  const cmd = `node scripts/agent.mjs pay --session 0 --payee 0x<PAYEE> --name "Your Name here TRADING" --amount 2\n# → reverted: BlockedByGuard(NoMatch) — funds never moved\n# → AgentPaymentBlocked event = permanent fraud evidence`;
  return (
    <div className="grid gap-4">
      <div>
        <div className="relative rounded-xl border border-neon-red/30 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
          <CopyButton text={cmd} label="Copy" />
          <pre className="mt-2 whitespace-pre-wrap">{cmd}</pre>
        </div>
      </div>
      <StepLinkRow href="/dashboard?tab=audit" label="Open Audit tab → show the blocked attempt + tx link" />
    </div>
  );
}

function CompletionCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-8 rounded-3xl border border-neon-green/40 bg-neon-green/5 p-8 text-center shadow-glow-green"
    >
      <CheckCircle2 className="mx-auto h-10 w-10 text-neon-green" />
      <h3 className="font-display mt-3 text-xl font-bold text-white">Demo complete — every guardrail held.</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
        Registered identity → attested → verified → bounded agent → fraudulent payment reverted
        on-chain, with the evidence permanently replayable from the block explorer.
      </p>
    </motion.div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {ok ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neon-green/20">
          <Check className="h-3.5 w-3.5 text-neon-green" />
        </span>
      ) : (
        <CircleDashed className="h-5 w-5 text-slate-600" />
      )}
      <span className={ok ? "text-slate-200" : "text-slate-500"}>{label}</span>
    </div>
  );
}

void Copy;

"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Coins,
  Cpu,
  FileSearch,
  Fingerprint,
  Globe,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserX,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "./Reveal";
import { Button } from "@/components/ui/kit";
import { EXPLORER_URL, RPC_URL } from "@/lib/web3/chain";
import { TUSD8_ADDRESS } from "@/lib/web3/addresses";

// ------------------------------------------------------------------ Problem

const PROBLEMS = [
  {
    icon: UserX,
    color: "text-neon-red",
    ring: "group-hover:shadow-glow-red",
    title: "A typo empties an account",
    body: "On-chain there is no name field and no undo. One swapped character in a pasted address and the transfer is permanent — straight into someone else's wallet.",
  },
  {
    icon: ShieldAlert,
    color: "text-neon-amber",
    ring: "",
    title: "The scammer gives you the address",
    body: "Invoice redirect fraud works because nothing verifies that the address in an email is really your supplier. The victim pushes the payment themselves — and it never comes back.",
  },
  {
    icon: Bot,
    color: "text-neon-caramel",
    ring: "",
    title: "AI agents pay at machine speed",
    body: "Autonomous agents act on instructions they read. Prompt-inject an invoice and an agent will happily wire out funds — with zero identity checks in its path.",
  },
];

export function Problem() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6" id="problem">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-caramel">The problem</p>
        <h2 className="font-display mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Crypto payments are the only rail where <span className="text-neon-red">nobody checks the name</span>.
        </h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Banks solved this years ago with Confirmation of Payee. Blockchain — where transfers are
          irreversible and AI agents are starting to pay autonomously — still has nothing.
        </p>
      </Reveal>
      <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
        {PROBLEMS.map((p) => (
          <StaggerItem key={p.title}>
            <div
              className={`group glass h-full rounded-2xl p-6 transition-all duration-300 hover:border-white/20 ${p.ring}`}
            >
              <div className={`inline-flex rounded-xl border border-white/10 bg-white/5 p-3 ${p.color}`}>
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-4 text-lg font-semibold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

// ------------------------------------------------------------------ How it works

const STEPS = [
  {
    icon: Fingerprint,
    title: "Identity registered",
    body: "A payee claims their own name, or a verifier endorses an address→name pair. Stored on Aevum, permanent and public.",
  },
  {
    icon: FileSearch,
    title: "Name is checked first",
    body: "Before any transfer, the guard calls checkPayee(address, name) — normalized comparison with typo-tolerant distance, the same semantics banks use.",
  },
  {
    icon: Lock,
    title: "Verdict gates the payment",
    body: "FULL MATCH proceeds. CLOSE MATCH warns. NO MATCH and NOT FOUND are reverted on-chain in enforce mode — the money simply cannot move.",
  },
  {
    icon: ShieldCheck,
    title: "Receipt lands on-chain",
    body: "Every check, payment and blocked attempt emits events — a verifiable audit trail anyone can replay from the block explorer.",
  },
];

const VERDICT_ROW = [
  { label: "FULL MATCH", cls: "border-neon-green/40 bg-neon-green/10 text-neon-green", icon: "✓" },
  { label: "CLOSE MATCH", cls: "border-neon-amber/40 bg-neon-amber/10 text-neon-amber", icon: "⚠" },
  { label: "NO MATCH", cls: "border-neon-red/40 bg-neon-red/10 text-neon-red", icon: "✕" },
  { label: "NOT FOUND", cls: "border-slate-500/40 bg-slate-500/10 text-slate-400", icon: "?" },
];

export function HowItWorks() {
  return (
    <section className="relative border-y border-white/5 bg-ink-900/40 py-20" id="how">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-caramel">How it works</p>
          <h2 className="font-display mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            One primitive: <span className="text-gradient">check first, pay second</span>.
          </h2>
        </Reveal>

        {/* flow diagram */}
        <Reveal className="mt-14">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
              <FlowNode label="Payer / Agent" sub="wants to send 100 tUSD8" icon={Coins} />
              <FlowArrow />
              <FlowNode
                label="PaySentry Guard"
                sub="checkPayee() on-chain"
                icon={ShieldCheck}
                highlight
              />
              <FlowArrow verdict />
              <FlowNode label="Payee" sub="verified identity" icon={Globe} />
            </div>
            <motion.div
              className="mt-6 flex flex-wrap items-center justify-center gap-3"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.35, delayChildren: 1.2 } } }}
            >
              {VERDICT_ROW.map((v) => (
                <motion.span
                  key={v.label}
                  variants={{
                    hidden: { opacity: 0, y: 10, scale: 0.9 },
                    show: { opacity: 1, y: 0, scale: 1 },
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wide ${v.cls}`}
                >
                  <span>{v.icon}</span> {v.label}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </Reveal>

        <Stagger className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <StaggerItem key={s.title}>
              <div className="group glass relative h-full rounded-2xl p-6 transition hover:border-neon-caramel/30">
                <span className="absolute right-5 top-4 font-display text-4xl font-bold text-white/5 transition group-hover:text-neon-caramel/15">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <s.icon className="h-6 w-6 text-neon-caramel" />
                <h3 className="font-display mt-4 text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function FlowNode({
  label,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  sub: string;
  icon: typeof Coins;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-3 rounded-xl border p-4 ${
        highlight
          ? "border-neon-caramel/50 bg-neon-caramel/5 shadow-glow-caramel"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className={`rounded-lg p-2.5 ${highlight ? "bg-neon-caramel/15 text-neon-caramel" : "bg-white/5 text-slate-300"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </div>
  );
}

function FlowArrow({ verdict }: { verdict?: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-center md:px-2">
      <motion.div
        className={`h-px w-10 ${verdict ? "bg-neon-caramel/60" : "bg-white/20"} relative md:w-16`}
        animate={verdict ? { opacity: [0.4, 1, 0.4] } : {}}
        transition={{ repeat: Infinity, duration: 2.4 }}
        aria-hidden
      >
        <span
          className={`absolute -top-[3px] right-0 h-[7px] w-[7px] rotate-45 border-r border-t ${
            verdict ? "border-neon-caramel" : "border-white/30"
          }`}
        />
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------------ Features

const FEATURES = [
  {
    icon: FileSearch,
    title: "On-chain payee registry",
    body: "Self-claimed identities + verifier attestations in a federated trust model. No name server, no backend, no database.",
    span: "md:col-span-2",
  },
  {
    icon: Lock,
    title: "Warn & Enforce modes",
    body: "Interactive flows can warn; autonomous agents are always enforced. Mismatches revert on-chain.",
  },
  {
    icon: Bot,
    title: "Bounded agent sessions",
    body: "Grant an agent a scoped session: per-tx limit, lifetime cap, expiry, instant revocation — enforced by the contract, not the agent.",
    span: "md:col-span-2",
  },
  {
    icon: FileSearch,
    title: "Permanent audit trail",
    body: "Every check, execution and blocked attempt is an event you can replay forever.",
  },
  {
    icon: Zap,
    title: "Zero backend",
    body: "The chain is the database. Frontend reads state directly via RPC.",
  },
  {
    icon: Cpu,
    title: "Reusable building block",
    body: "MIT-licensed, dependency-free contracts — drop the registry into any checkout, invoice or agent flow.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" id="features">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-caramel">Features</p>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Guardrails that live <span className="text-gradient">inside the payment rail</span>.
        </h2>
      </Reveal>
      <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
        {FEATURES.map((f) => (
          <StaggerItem key={f.title} className={f.span}>
            <div className="group glass h-full rounded-2xl p-6 transition hover:border-neon-caramel/40">
              <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-3 text-neon-caramel transition group-hover:shadow-glow-caramel">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display mt-4 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.body}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

// ------------------------------------------------------------------ Built on QDay

export function BuiltOn() {
  return (
    <section className="border-y border-white/5 bg-ink-900/40 py-20" id="qday">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-caramel">
            Built on QDay Aevum
          </p>
          <h2 className="font-display mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Post-quantum rails for the <span className="text-gradient">agentic economy</span>.
          </h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            PaySentry settles on QDay&apos;s Aevum testnet — an EVM-compatible chain designed for
            machine-driven commerce. Identity, guard and receipts live natively where agents
            already operate.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: "Chain ID", v: "44005" },
            { k: "RPC", v: RPC_URL.replace("https://", "") },
            { k: "Stablecoin", v: "tUSD8 · 6 decimals" },
            { k: "Settlement", v: "Sub-second" },
          ].map((c) => (
            <StaggerItem key={c.k}>
              <div className="glass rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{c.k}</p>
                <p className="mt-1.5 break-all font-mono text-sm text-neon-caramel">{c.v}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-8">
          <div className="glass flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-sm text-slate-300">
                Try it yourself — grab test tokens from the faucet and follow the guided demo. All
                settlement uses tUSD8
                <span className="ml-1 font-mono text-xs text-slate-500">({TUSD8_ADDRESS.slice(0, 14)}…)</span>.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="https://faucet.qday.info/en" target="_blank" rel="noreferrer">
                <Button variant="subtle" size="sm">Faucet ↗</Button>
              </a>
              <a href={EXPLORER_URL} target="_blank" rel="noreferrer">
                <Button variant="subtle" size="sm">Explorer ↗</Button>
              </a>
              <a href="https://dorahacks.io/hackathon/qday" target="_blank" rel="noreferrer">
                <Button variant="subtle" size="sm">Hackathon ↗</Button>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ SDK

export function SDKSection() {
  return (
    <section className="py-20" id="sdk">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neon-caramel">For builders</p>
          <h2 className="font-display mt-3 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Drop CoP into any checkout with <span className="text-gradient">one function</span>.
          </h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            The <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-neon-caramel">paysentry-sdk</code>{" "}
            wraps the on-chain guard in a single call. No ABI wrangling, no wagmi dependency —
            works in any dapp, script, or agent. Defaults to the live testnet deployment.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <div className="glass flex h-full flex-col justify-between rounded-2xl p-6">
              <div>
                <h3 className="font-display text-lg font-semibold text-white">What you get</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {[
                    "Verdict before payment — not after",
                    "Mismatched payees revert on-chain",
                    "Optional Warn / Enforce modes",
                    "Bounded agent sessions out of the box",
                    "Zero infra: pure viem + public RPC",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neon-green/20">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                          <path d="M2 5l2 2 4-4" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[11px] text-slate-400">
                npm i paysentry-sdk
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-neon-red/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-neon-amber/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-neon-green/70" />
                <span className="ml-3 font-mono text-[11px] text-slate-500">checkout.ts</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-slate-300">
                <code>{`const result = await guardPay({
  payee: form.address,
  expectedName: form.recipientName,
  amount: cart.total,   // tUSD8
  signer,
});

if (!result.paid) {
  // NO MATCH / NOT FOUND — tell the user,
  // abort the checkout before money moves.
  throw new Error(result.message);
}

// ✓ paid — verdict on the audit trail
console.log(result.verdictLabel, result.txHash);`}</code>
              </pre>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ CTA

export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-neon-caramel/25 bg-gradient-to-br from-neon-caramel/10 via-transparent to-neon-caramel/15 p-10 text-center sm:p-16">
          <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Check first. Pay second. <span className="text-gradient">Always.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-300">
              Open the dashboard to verify a payee, run a guarded payment, or watch an agent get
              stopped mid-transaction by the guardrail.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg">Launch dashboard</Button>
              </Link>
              <Link href="/demo">
                <Button size="lg" variant="outline">Start guided demo</Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

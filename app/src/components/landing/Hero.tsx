"use client";

import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { HeroScene } from "@/components/three/HeroScene";
import { Stagger, StaggerItem } from "./Reveal";

const STATS = [
  { value: "£460M+", label: "lost to APP scams in the UK in a single year — transfers victims made themselves" },
  { value: "Oct 2025", label: "EU Verification-of-Payee becomes mandatory for every PSP — banks now check names" },
  { value: "0 databases", label: "PaySentry stores every identity, check and receipt fully on-chain" },
];

export function Hero() {
  return (
    <section className="relative flex min-h-[94vh] items-center overflow-hidden">
      <div className="absolute inset-0 grid-bg radial-fade" aria-hidden />
      {/* 3D scene dimmed so the wireframe globe never fights the headline */}
      <div className="absolute inset-0 opacity-55" aria-hidden>
        <HeroScene />
      </div>
      {/* mascot in the background, bottom-right, peeking in behind the content */}
      <div
        className="pointer-events-none absolute -bottom-8 -right-8 z-0 hidden w-[300px] sm:block lg:w-[430px]"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot-bg.png" alt="" className="animate-float h-auto w-full opacity-90" />
      </div>
      {/* light scrim behind the text column only — strong enough to calm the
          globe, weak enough that the aurora bands still show through */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_58%_46%_at_50%_42%,rgba(250,246,239,0.65)_0%,rgba(250,246,239,0.35)_55%,transparent_80%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,transparent_30%,#faf6ef_100%)]"
        aria-hidden
      />

      <Stagger className="relative z-10 mx-auto w-full max-w-6xl px-4 py-28 sm:px-6">
        <StaggerItem className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-neon-caramel/40 bg-neon-caramel/10 px-4 py-1.5 text-xs font-medium text-neon-caramel">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-caramel opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-caramel" />
            </span>
            Built for QDay Aevum Builder Challenge #1 · Confirmation of Payee track
          </span>
        </StaggerItem>

        <StaggerItem className="mt-8 text-center">
          <h1 className="font-display mx-auto max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Know exactly <span className="text-gradient">who you&apos;re paying</span> — before the
            money moves.
          </h1>
        </StaggerItem>

        <StaggerItem className="mt-6 text-center">
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#6b543a] sm:text-lg">
            PaySentry is a trustless Confirmation-of-Payee layer for stablecoin payments. Every
            payee is verified on-chain, every mismatch is blocked or flagged, every attempt —
            human or AI agent — lands on a permanent audit trail.
          </p>
        </StaggerItem>

        <StaggerItem className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/dashboard">
            <motion.span
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-caramel to-neon-caramel px-7 py-3.5 font-semibold text-ink shadow-glow-caramel transition hover:brightness-110"
            >
              Launch dashboard <ArrowRight className="h-4 w-4" />
            </motion.span>
          </Link>
          <Link href="/demo">
            <motion.span
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-900/15 px-7 py-3.5 font-medium text-ink transition hover:border-neon-caramel/60 hover:text-neon-caramel"
            >
              <PlayCircle className="h-4 w-4" /> Guided demo flow
            </motion.span>
          </Link>
        </StaggerItem>

        <StaggerItem className="mt-20">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {STATS.map((s) => (
              <div
                key={s.value}
                className="glass rounded-2xl p-5 text-center transition hover:border-neon-caramel/30"
              >
                <p className="font-display text-2xl font-bold text-gradient">{s.value}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#6b543a]">{s.label}</p>
              </div>
            ))}
          </div>
        </StaggerItem>
      </Stagger>

      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-[#97836a]"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        aria-hidden
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </section>
  );
}

"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <path
          d="M16 2L28 7v8c0 8.2-5.1 13.5-12 16C9.1 28.5 4 23.2 4 15V7l12-5z"
          stroke="url(#lg)"
          strokeWidth="2"
          fill="rgba(34,211,238,0.08)"
        />
        <path
          d="M10.5 16.2l3.6 3.6 7.4-7.6"
          stroke="url(#lg)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">
        <span className="text-white">Pay</span>
        <span className="text-gradient">Sentry</span>
      </span>
    </span>
  );
}

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#qday", label: "QDay" },
  { href: "/demo", label: "Guided demo" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-strong shadow-lg" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="transition hover:opacity-90">
          <Logo />
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <ConnectButton.Custom>
            {({ account, openAccountModal, openConnectModal, mounted }) => {
              const connected = mounted && account;
              return (
                <div aria-hidden={!mounted}>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={connected ? openAccountModal : openConnectModal}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      connected
                        ? "border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20"
                        : "bg-gradient-to-r from-neon-cyan to-neon-violet text-ink hover:brightness-110"
                    }`}
                  >
                    <ShieldCheck className="mr-1.5 inline h-4 w-4" />
                    {connected ? account.displayName : "Connect Wallet"}
                  </motion.button>
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </nav>
    </header>
  );
}

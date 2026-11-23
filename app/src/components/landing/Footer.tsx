"use client";

import { Logo } from "./Nav";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
        <Logo size={24} />
        <p className="order-3 text-center text-xs text-slate-500 md:order-2">
          Trustless Confirmation of Payee · MIT License · Built for{" "}
          <a
            href="https://dorahacks.io/hackathon/qday"
            target="_blank"
            rel="noreferrer"
            className="text-neon-cyan hover:underline"
          >
            Aevum Builder Challenge #1
          </a>
        </p>
        <div className="order-2 flex gap-5 text-xs text-slate-400 md:order-3">
          <a href="/dashboard" className="hover:text-neon-cyan">App</a>
          <a href="/demo" className="hover:text-neon-cyan">Demo</a>
          <a
            href="https://explorer-test.qday.info"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neon-cyan"
          >
            Explorer
          </a>
          <a
            href="https://wiki.qday.info"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neon-cyan"
          >
            Docs
          </a>
        </div>
      </div>
    </footer>
  );
}

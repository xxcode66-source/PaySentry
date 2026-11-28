"use client";

import Link from "next/link";
import { Logo } from "./Nav";
import { EXPLORER_URL } from "@/lib/web3/chain";
import { GUARD_ADDRESS, REGISTRY_ADDRESS } from "@/lib/web3/addresses";
import { shortAddr } from "@/lib/format";

const COLS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Verify a payee", href: "/dashboard?tab=verify" },
      { label: "Guarded payment", href: "/dashboard?tab=pay" },
      { label: "Audit trail", href: "/dashboard?tab=audit" },
      { label: "Guided demo", href: "/demo" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Block explorer", href: EXPLORER_URL, external: true },
      { label: "QDay docs", href: "https://wiki.qday.info", external: true },
      { label: "Testnet faucet", href: "https://faucet.qday.info/en", external: true },
      { label: "GitHub", href: "https://github.com/xxcode66-source/PaySentry", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-stone-900/5 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo size={24} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#6b543a]">
              Trustless Confirmation of Payee for the agentic economy. Check first, pay second —
              enforced on-chain, not by trust.
            </p>
            <p className="mt-4 text-xs text-[#97836a]">
              MIT License · Built for{" "}
              <a
                href="https://dorahacks.io/hackathon/qday"
                target="_blank"
                rel="noreferrer"
                className="text-neon-caramel hover:underline"
              >
                Aevum Builder Challenge #1
              </a>
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#97836a]">
                {col.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[#6b543a] transition hover:text-neon-caramel"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-[#6b543a] transition hover:text-neon-caramel"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-stone-900/5 pt-5 font-mono text-[11px] text-[#97836a]">
          <span>QDay Aevum · chain 44005</span>
          <span>
            Guard{" "}
            <a href={`${EXPLORER_URL}/address/${GUARD_ADDRESS}`} target="_blank" rel="noreferrer" className="text-[#7d6a52] hover:text-neon-caramel">
              {shortAddr(GUARD_ADDRESS, 4)}
            </a>
          </span>
          <span>
            Registry{" "}
            <a href={`${EXPLORER_URL}/address/${REGISTRY_ADDRESS}`} target="_blank" rel="noreferrer" className="text-[#7d6a52] hover:text-neon-caramel">
              {shortAddr(REGISTRY_ADDRESS, 4)}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

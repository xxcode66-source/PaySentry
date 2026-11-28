"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { ShieldCheck, Wallet } from "lucide-react";

/** One wallet button used by the landing Nav and the dashboard shell, so
 *  connecting is possible from every page — not just the homepage.
 *  Connected state shows the account name with a live chain dot; tapping it
 *  opens RainbowKit's account modal (switch / disconnect). */
export function WalletButton({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div aria-hidden={!mounted} className={mounted ? "" : "pointer-events-none opacity-0"}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={connected ? openAccountModal : openConnectModal}
              className={`inline-flex items-center gap-2 rounded-xl text-sm font-semibold transition ${
                connected
                  ? "border border-neon-caramel/40 bg-neon-caramel/10 text-neon-caramel hover:bg-neon-caramel/20"
                  : "bg-neon-caramel text-ink shadow-glow-caramel hover:brightness-110"
              } ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2"}`}
            >
              {connected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-green" />
                  </span>
                  {account.displayName}
                </>
              ) : (
                <>
                  {compact ? (
                    <Wallet className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Connect Wallet
                </>
              )}
            </motion.button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

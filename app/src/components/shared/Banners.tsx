"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useChainId, useSwitchChain } from "wagmi";
import { qdayAevum } from "@/lib/web3/chain";
import { contractsConfigured } from "@/lib/web3/addresses";
import { Button } from "@/components/ui/kit";

export function WrongNetworkBanner({ visible }: { visible: boolean }) {
  const chainId = useChainId();
  const switchChain = useSwitchChain();
  if (!visible || chainId === qdayAevum.id) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex flex-col gap-2 rounded-xl border border-neon-red/40 bg-neon-red/10 p-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-neon-red">
        <strong>Wrong network.</strong> Switch to QDay Aevum Testnet (chain {qdayAevum.id}) to
        continue.
      </p>
      <Button size="sm" variant="danger" onClick={() => switchChain.switchChain({ chainId: qdayAevum.id })}>
        Switch network
      </Button>
    </motion.div>
  );
}

export function ContractsMissingBanner() {
  if (contractsConfigured) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-xl border border-neon-amber/40 bg-neon-amber/10 p-3.5 text-sm text-neon-amber"
    >
      <p>
        <strong>Contracts not configured yet.</strong> Deploy the registry + guard, then set{" "}
        <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-xs">
          NEXT_PUBLIC_REGISTRY_ADDRESS
        </code>{" "}
        and{" "}
        <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-xs">
          NEXT_PUBLIC_GUARD_ADDRESS
        </code>{" "}
        in <code className="font-mono text-xs">app/.env.local</code>. Full guide in the README
        (§Deploy). Until then, on-chain actions are disabled but the interface and matching logic
        preview still work.
      </p>
    </motion.div>
  );
}

export function FaucetChip({ address }: { address?: string }) {
  if (!address) return null;
  return (
    <a
      href={`https://faucet.qday.info/en`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-neon-caramel/30 bg-neon-caramel/5 px-3 py-1 text-[11px] text-neon-caramel transition hover:bg-neon-caramel/15"
    >
      Need test tokens? Faucet <ExternalLink className="h-3 w-3" />
    </a>
  );
}

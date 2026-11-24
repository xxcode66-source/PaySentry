"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, ReceiptText, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import {
  useAccount,
  useContractRead,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Button, PanelHeader, VerdictPill } from "@/components/ui/kit";
import { predictCheck } from "@/lib/cop/simulate";
import { explainTxError, formatUsd, parseUsd, shortAddr } from "@/lib/format";
import { toast } from "@/lib/store/toast";
import { ERC20_ABI, GUARD_ABI, REGISTRY_ABI } from "@/lib/web3/abis";
import { GUARD_ADDRESS, REGISTRY_ADDRESS, TUSD8_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { txLink } from "@/lib/web3/chain";

type Mode = 0 | 1; // Warn | Enforce

export function PayPanel({ prefill }: { prefill?: { address?: string; name?: string } }) {
  const { address: me } = useAccount();
  const [payee, setPayee] = useState(prefill?.address ?? "");
  const [name, setName] = useState(prefill?.name ?? "");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<Mode>(1);
  const [blocked, setBlocked] = useState<{ title: string; desc: string } | null>(null);

  const validPayee = isAddress(payee);
  const parsed = parseUsd(amount);

  // Identity + predicted verdict for the payee as the user types
  const { data: identity } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "payeeOf",
    args: [payee as `0x${string}`],
    query: { enabled: contractsConfigured && validPayee },
  });
  const candidates = useMemo(() => (identity?.[0] ? [identity[0]] : []), [identity]);
  const predicted = useMemo(() => predictCheck(candidates, name), [candidates, name]);

  // Balance & allowance
  const { data: balance, refetch: refetchBalance } = useContractRead({
    abi: ERC20_ABI,
    address: TUSD8_ADDRESS,
    functionName: "balanceOf",
    args: [me as `0x${string}`],
    query: { enabled: !!me },
  });
  const { data: allowance, refetch: refetchAllowance } = useContractRead({
    abi: ERC20_ABI,
    address: TUSD8_ADDRESS,
    functionName: "allowance",
    args: [me as `0x${string}`, GUARD_ADDRESS],
    query: { enabled: !!me && contractsConfigured },
  });

  const needsApproval = contractsConfigured && !!parsed && (allowance ?? 0n) < parsed;

  // Writes
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const [awaiting, setAwaiting] = useState<"approve" | "pay" | null>(null);
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!hash || !awaiting) return;
    if (confirming) return;
    if (isSuccess) {
      if (awaiting === "approve") {
        toast.success("Approval confirmed", "The guard can now move the approved amount.");
        refetchAllowance();
      } else {
        toast.success("Guarded payment executed", "Receipt recorded on-chain.", hash);
        refetchBalance();
      }
      setAwaiting(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, confirming, hash, awaiting]);

  useEffect(() => {
    if (error && awaiting) {
      const ex = explainTxError(error);
      toast.error(ex.title, ex.desc);
      if (awaiting === "pay" && ex.title.startsWith("Payment blocked")) setBlocked(ex);
      setAwaiting(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const doApprove = () => {
    if (!parsed) return;
    setBlocked(null);
    setAwaiting("approve");
    writeContract({
      abi: ERC20_ABI,
      address: TUSD8_ADDRESS,
      functionName: "approve",
      args: [GUARD_ADDRESS, parsed],
    });
  };

  const doPay = () => {
    if (!parsed || !validPayee) return;
    setBlocked(null);
    setAwaiting("pay");
    writeContract({
      abi: GUARD_ABI,
      address: GUARD_ADDRESS,
      functionName: "executeGuarded",
      args: [TUSD8_ADDRESS, payee as `0x${string}`, name, parsed, mode],
    });
  };

  const ready = contractsConfigured && me && validPayee && name.trim() && parsed && parsed > 0n;

  return (
    <div>
      <PanelHeader
        title="Guarded payment"
        desc="Send tUSD8 through the guard. In enforce mode a name mismatch reverts the transaction on-chain — before any token moves."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-neon-cyan">
          tUSD8 {shortAddr(TUSD8_ADDRESS, 6)}
        </span>
        <span>balance: <b className="text-slate-200">{formatUsd(balance)}</b></span>
        <span>allowance to guard: <b className="text-slate-200">{formatUsd(allowance)}</b></span>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Payee address</label>
            <input
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-neon-cyan/60 focus:bg-ink-800"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Amount (tUSD8)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              inputMode="decimal"
              className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-neon-cyan/60 focus:bg-ink-800"
            />
            {amount && !parsed && (
              <p className="mt-1 text-[11px] text-neon-red">Invalid amount.</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Payee name as intended <span className="text-slate-500">(checked against the registry)</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Your Name here'
            className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-neon-cyan/60 focus:bg-ink-800"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Predicted verdict:</span>
            {name.trim() && candidates.length > 0 ? (
              <VerdictPill result={predicted.result} size="sm" />
            ) : (
              <span className="text-[11px] text-slate-600">—</span>
            )}
          </div>
        </div>

        {/* Mode selector */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === 0}
            onClick={() => setMode(0)}
            title="Warn"
            desc="Proceed even on mismatch, but flag it on the audit trail. For interactive flows where a human reviews."
          />
          <ModeCard
            active={mode === 1}
            onClick={() => setMode(1)}
            title="Enforce"
            desc="Revert on NO MATCH / NOT FOUND. Recommended — this is what agents use by default."
            badge="recommended"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {needsApproval && (
            <Button onClick={doApprove} loading={awaiting === "approve"}>
              Approve guard for {formatUsd(parsed)} tUSD8
            </Button>
          )}
          <Button
            onClick={doPay}
            disabled={!ready || needsApproval}
            loading={awaiting === "pay"}
            variant={mode === 1 ? "primary" : "subtle"}
          >
            Send {parsed ? formatUsd(parsed) : ""} tUSD8 {mode === 1 ? "· enforced" : "· warn only"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!me && <span className="text-xs text-slate-500">Connect your wallet to pay.</span>}
        </div>

        {/* Blocked card */}
        <AnimatePresence>
          {blocked && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="rounded-2xl border border-neon-red/50 bg-neon-red/10 p-5 shadow-glow-red"
            >
              <div className="flex items-center gap-2.5 text-neon-red">
                <TriangleAlert className="h-5 w-5" />
                <p className="font-display font-semibold">{blocked.title}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{blocked.desc}</p>
              <p className="mt-2 text-xs text-slate-500">
                The revert is permanent, public evidence that this payment attempt was stopped — see the Audit tab.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Receipt — shown once the guarded payment is confirmed */}
        <AnimatePresence>
          {awaiting === null && hash && isSuccess && !confirming && !blocked && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-neon-green/40 bg-neon-green/5 p-5 shadow-glow-green"
            >
              <div className="flex items-center gap-2.5 text-neon-green">
                <ReceiptText className="h-5 w-5" />
                <p className="font-display font-semibold">Payment receipt — on-chain verdict recorded</p>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {formatUsd(parsed)} tUSD8 → “{name}”
              </p>
              <Link href={txLink(hash)} target="_blank" className="mt-2 inline-block font-mono text-xs text-neon-cyan hover:underline">
                {hash.slice(0, 26)}… ↗
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  desc,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
        active
          ? "border-neon-cyan/60 bg-neon-cyan/5 shadow-glow-cyan"
          : "border-white/10 bg-white/[0.02] hover:border-white/25"
      }`}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className={`h-4 w-4 ${active ? "text-neon-cyan" : "text-slate-500"}`} />
        <span className={`text-sm font-semibold ${active ? "text-white" : "text-slate-300"}`}>{title}</span>
        {badge && (
          <span className="rounded-full border border-neon-green/40 bg-neon-green/10 px-2 py-0.5 text-[10px] text-neon-green">
            {badge}
          </span>
        )}
        {active && <BadgeCheck className="ml-auto h-4 w-4 text-neon-cyan" />}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{desc}</p>
    </button>
  );
}

"use client";

import { motion } from "framer-motion";
import { Bot, CircleSlash, Clock, Terminal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import {
  useAccount,
  useContractRead,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Button, CopyButton, PanelHeader } from "@/components/ui/kit";
import { WalletButton } from "@/components/shared/WalletButton";
import { durationLeft, explainTxError, formatUsd, parseUsd, shortAddr } from "@/lib/format";
import { toast } from "@/lib/store/toast";
import { ERC20_ABI, GUARD_ABI } from "@/lib/web3/abis";
import { GUARD_ADDRESS, TUSD8_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";

export function SessionsPanel() {
  const { address: me } = useAccount();
  const [agent, setAgent] = useState("");
  const [maxPerTx, setMaxPerTx] = useState("5");
  const [capTotal, setCapTotal] = useState("50");
  const [days, setDays] = useState("7");
  const [awaiting, setAwaiting] = useState<"approve" | "create" | "revoke" | null>(null);
  const [phaseCreate, setPhaseCreate] = useState(false);

  const parsedMax = parseUsd(maxPerTx);
  const parsedCap = parseUsd(capTotal);
  const validAgent = isAddress(agent);

  const { writeContract, data: writeHash, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: writeHash });

  const { data: allowance, refetch: refetchAllowance } = useContractRead({
    abi: ERC20_ABI,
    address: TUSD8_ADDRESS,
    functionName: "allowance",
    args: [me as `0x${string}`, GUARD_ADDRESS],
    query: { enabled: !!me && contractsConfigured },
  });
  const { data: sessionIds, refetch: refetchIds } = useContractRead({
    abi: GUARD_ABI,
    address: GUARD_ADDRESS,
    functionName: "getSessionIds",
    args: [me as `0x${string}`],
    query: { enabled: !!me && contractsConfigured, refetchInterval: 5000 },
  });

  useEffect(() => {
    if (!writeHash || !awaiting) return;
    if (isSuccess && !confirming) {
      if (awaiting === "approve" && phaseCreate) {
        // approval confirmed → send the actual session creation
        setAwaiting("create");
        writeContract({
          abi: GUARD_ABI,
          address: GUARD_ADDRESS,
          functionName: "createSession",
          args: [
            agent as `0x${string}`,
            TUSD8_ADDRESS,
            parsedMax as bigint,
            parsedCap as bigint,
            BigInt(Math.max(1, Number(days) || 1)) * 86400n,
            1, // Enforce — agents are always enforced
          ],
        });
      } else {
        toast.success(
          awaiting === "approve" ? "Approval confirmed" : "Session created",
          awaiting === "create" ? "The agent is now active within its hard limits." : undefined,
          writeHash
        );
        refetchAllowance();
        refetchIds();
        setAwaiting(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, confirming, writeHash, awaiting, phaseCreate]);

  useEffect(() => {
    if (error && awaiting) {
      const ex = explainTxError(error);
      toast.error(ex.title, ex.desc);
      setAwaiting(null);
      setPhaseCreate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const needsApproval = contractsConfigured && !!parsedCap && (allowance ?? 0n) < parsedCap;

  const approveThenCreate = async () => {
    if (!parsedMax || !parsedCap || !validAgent || !me) return;
    setAwaiting("approve");
    setPhaseCreate(true); // after approval confirms, the watcher above creates the session
    writeContract({
      abi: ERC20_ABI,
      address: TUSD8_ADDRESS,
      functionName: "approve",
      args: [GUARD_ADDRESS, parsedCap],
    });
  };

  const ready = contractsConfigured && !!me && validAgent && parsedMax && parsedCap && parsedMax > 0n && parsedCap >= parsedMax;

  return (
    <div>
      <PanelHeader
        title="Agent sessions"
        desc="Grant an autonomous agent least-privilege spending: per-transaction limit, lifetime cap, expiry and instant revocation — enforced by the contract, never by the agent."
      />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Create form */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-neon-caramel">
            <Bot className="h-4 w-4" />
            <h3 className="font-display text-sm font-semibold text-white">New session</h3>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Agent address</label>
              <input
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                placeholder="0x… agent wallet"
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-neon-caramel/60"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Max / tx (tUSD8)</label>
                <input
                  value={maxPerTx}
                  onChange={(e) => setMaxPerTx(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-neon-caramel/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Lifetime cap</label>
                <input
                  value={capTotal}
                  onChange={(e) => setCapTotal(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-neon-caramel/60"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Expires after (days)</label>
              <input
                value={days}
                onChange={(e) => setDays(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-neon-caramel/60"
              />
            </div>
            {/* Presets — one tap, no typing */}
            <div>
              <p className="mb-1.5 text-[11px] text-slate-500">Presets</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Cautious · 1 / 10 / 7d", max: "1", cap: "10", d: "7" },
                  { label: "Standard · 5 / 50 / 7d", max: "5", cap: "50", d: "7" },
                  { label: "Generous · 25 / 250 / 30d", max: "25", cap: "250", d: "30" },
                ].map((p) => {
                  const active = maxPerTx === p.max && capTotal === p.cap && days === p.d;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setMaxPerTx(p.max);
                        setCapTotal(p.cap);
                        setDays(p.d);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                        active
                          ? "border-neon-caramel/60 bg-neon-caramel/10 text-neon-caramel"
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="rounded-lg border border-neon-caramel/30 bg-neon-caramel/5 px-3 py-2 text-[11px] leading-relaxed text-neon-caramel">
              CoP is <b>always enforced</b> for agent spend — the guard reverts on NO MATCH / NOT
              FOUND and records every blocked attempt on-chain.
            </p>
            <Button
              onClick={approveThenCreate}
              disabled={!ready}
              loading={awaiting !== null || confirming}
            >
              {needsApproval ? `1/2 · Approve ${formatUsd(parsedCap)} then create` : "Create session"}
            </Button>
            {!me && <WalletButton compact />}
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-white">Your sessions</h3>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-400">
              {sessionIds ? `${(sessionIds as bigint[]).length} active` : "—"}
            </span>
          </div>
          <div className="grid gap-3">
            {sessionIds && sessionIds.length > 0 ? (
              [...(sessionIds as bigint[])].reverse().map((id) => <SessionCard key={id.toString()} id={id} />)
            ) : (
              <div className="glass rounded-2xl p-10 text-center">
                <Bot className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-3 text-sm font-medium text-slate-300">No sessions yet</p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                  {me
                    ? "Create your first agent session on the left — pick a preset, set the limits, and the guard enforces them on-chain."
                    : "Connect your wallet to see your sessions."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ id }: { id: bigint }) {
  const { data: s } = useContractRead({
    abi: GUARD_ABI,
    address: GUARD_ADDRESS,
    functionName: "sessions",
    args: [id],
    query: { refetchInterval: 5000 },
  });
  const { data: usage } = useContractRead({
    abi: GUARD_ABI,
    address: GUARD_ADDRESS,
    functionName: "sessionUsage",
    args: [id],
    query: { refetchInterval: 5000 },
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  void tick;

  if (!s || !usage) return <div className="glass h-36 animate-pulse rounded-2xl" />;

  const agentAddr = s[1] as string;
  const maxPerTx = s[3] as bigint;
  const spent = usage[0] as bigint;
  const cap = usage[1] as bigint;
  const isActive = Boolean(usage[2]);
  const expiry = Number(usage[3]);
  const pct = cap > 0n ? Number((spent * 100n) / cap) : 0;
  const expired = expiry > 0 && expiry <= Math.floor(Date.now() / 1000);

  const cmd = `node scripts/agent.mjs pay --session ${id.toString()} --payee 0xPAYEE --name "Your Name here" --amount 2`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-neon-caramel/10 px-2.5 py-1 font-mono text-xs text-neon-caramel">
            #{id.toString()}
          </span>
          <span className="text-xs text-slate-400">
            agent <span className="font-mono text-slate-200">{shortAddr(agentAddr)}</span>
          </span>
        </div>
        <StatusChip active={isActive} expired={expired} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <Stat label="Max / tx" value={formatUsd(maxPerTx)} />
        <Stat label="Spent" value={formatUsd(spent)} />
        <Stat label="Cap" value={formatUsd(cap)} />
      </div>

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full ${pct > 80 ? "bg-neon-red" : "bg-gradient-to-r from-neon-caramel to-neon-caramel"}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{pct}% of lifetime cap used</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {expired ? "expired" : durationLeft(expiry)}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <RevokeButton id={id} />
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[10px] text-slate-400">
          <Terminal className="h-3 w-3" /> {cmd.slice(0, 48)}…
        </span>
        <CopyButton text={cmd} label="Copy agent cmd" />
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-slate-200">{value}</p>
    </div>
  );
}

function StatusChip({ active, expired }: { active: boolean; expired: boolean }) {
  const cls = !active
    ? "border-neon-red/40 bg-neon-red/10 text-neon-red"
    : expired
      ? "border-slate-500/40 bg-slate-500/10 text-slate-400"
      : "border-neon-green/40 bg-neon-green/10 text-neon-green";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active && !expired ? "animate-pulse bg-neon-green" : "bg-current"}`} />
      {!active ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE"}
    </span>
  );
}

function RevokeButton({ id }: { id: bigint }) {
  const { writeContract } = useWriteContract();
  return (
    <Button
      size="sm"
      variant="danger"
      onClick={() => {
        writeContract({
          abi: GUARD_ABI,
          address: GUARD_ADDRESS,
          functionName: "revokeSession",
          args: [id],
        });
        toast.info("Revoke requested", "Once confirmed, no further agent spend is possible.");
      }}
    >
      <CircleSlash className="h-3.5 w-3.5" /> Revoke
    </Button>
  );
}

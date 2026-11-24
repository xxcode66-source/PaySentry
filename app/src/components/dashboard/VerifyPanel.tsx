"use client";

import { motion } from "framer-motion";
import { ExternalLink, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import { useContractRead } from "wagmi";
import { LevelBadge, PanelHeader, VerdictPill } from "@/components/ui/kit";
import { MATCH_LABELS, predictCheck, verdictExplainer } from "@/lib/cop/simulate";
import { REGISTRY_ABI } from "@/lib/web3/abis";
import { REGISTRY_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import { addressLink } from "@/lib/web3/chain";

function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function VerifyPanel({ prefill }: { prefill?: { address?: string; name?: string } }) {
  const [address, setAddress] = useState(prefill?.address ?? "");
  const [name, setName] = useState(prefill?.name ?? "");
  const dAddress = useDebounced(address);
  const dName = useDebounced(name);

  const valid = isAddress(dAddress);
  const enabled = contractsConfigured && valid && dName.trim().length > 0;

  const { data: identity } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "payeeOf",
    args: [dAddress as `0x${string}`],
    query: { enabled: contractsConfigured && valid },
  });
  const { data: altNames } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "attestedNamesOf",
    args: [dAddress as `0x${string}`],
    query: { enabled: contractsConfigured && valid },
  });
  const { data: check, isLoading: checkLoading } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "checkPayee",
    args: [dAddress as `0x${string}`, dName],
    query: { enabled, refetchInterval: 6000 },
  });

  const candidates = useMemo(() => {
    if (!identity) return [];
    const display = identity[0];
    const alts = (altNames as readonly string[] | undefined) ?? [];
    return [display, ...alts].filter((s) => s && s.length > 0);
  }, [identity, altNames]);

  const predicted = useMemo(() => predictCheck(candidates, dName), [candidates, dName]);

  const onChainResult = contractsConfigured && enabled ? (check?.[0] as number | undefined) : undefined;
  const result =
    onChainResult !== undefined ? onChainResult : dName.trim() && candidates.length > 0 ? predicted.result : undefined;
  const matchedAs = onChainResult !== undefined ? ((check?.[1] as string) ?? "") : predicted.matchedAs;
  const level = identity ? Number(identity[2]) : undefined;
  const attCount = identity ? Number(identity[3]) : undefined;
  const displayName = identity?.[0] ?? "";

  const cardBorder =
    result === 3
      ? "border-neon-green/40 bg-neon-green/5 shadow-glow-green"
      : result === 2
        ? "border-neon-amber/40 bg-neon-amber/5"
        : result === 1
          ? "border-neon-red/40 bg-neon-red/5 shadow-glow-red"
          : "border-white/10 bg-white/[0.02]";

  return (
    <div>
      <PanelHeader
        title="Verify a payee"
        desc="The core Confirmation-of-Payee primitive: does this address really belong to the name you intend to pay?"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Payee address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-neon-cyan/60 focus:bg-ink-800"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            {!address
              ? "Paste any address."
              : valid
                ? displayName
                  ? `Registered as “${displayName}”`
                  : "No identity registered for this address."
                : "Not a valid address yet."}
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Name you intend to pay
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Your Name here'
            className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-neon-cyan/60 focus:bg-ink-800"
          />
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Live prediction:</span>
            {dName.trim() && candidates.length > 0 ? (
              <VerdictPill result={predicted.result} size="sm" />
            ) : (
              <span className="text-[11px] text-slate-600">type a name…</span>
            )}
          </div>
        </div>
      </div>

      {/* Result card */}
      <motion.div layout className={`mt-6 rounded-2xl border p-6 transition-colors duration-500 ${cardBorder}`}>
        {checkLoading && contractsConfigured && enabled ? (
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-neon-cyan" />
            Querying the registry on-chain…
          </div>
        ) : result === undefined ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <Search className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-500">
              Enter an address and a name to run the check.
            </p>
            <p className="text-xs text-slate-600">
              Verdicts come straight from <span className="font-mono">PayeeRegistry.checkPayee</span>.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <VerdictPill result={result} size="lg" />
              <span className="text-[11px] text-slate-500">
                {checkLoading && contractsConfigured && enabled
                  ? "querying chain…"
                  : contractsConfigured && enabled
                    ? "verified on-chain"
                    : "predicted (client-side mirror of the contract)"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {verdictExplainer(result as 0 | 1 | 2 | 3, matchedAs)}
            </p>

            {contractsConfigured && enabled && (
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-slate-500">Registry label</dt>
                  <dd className="mt-1 text-slate-200">{displayName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Identity level</dt>
                  <dd className="mt-1">{level !== undefined ? <LevelBadge level={level} /> : "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Verifier attestations</dt>
                  <dd className="mt-1 text-slate-200">{attCount ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Verdict (raw)</dt>
                  <dd className="mt-1 font-mono text-slate-200">{MATCH_LABELS[result]} ({result})</dd>
                </div>
              </dl>
            )}

            {candidates.length > 1 && (
              <p className="mt-4 text-[11px] text-slate-500">
                Accepted names: {candidates.filter(Boolean).map((c) => `“${c}”`).join(", ")}
              </p>
            )}

            {valid && (
              <a
                href={addressLink(address)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-neon-cyan hover:underline"
              >
                View address on explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </motion.div>

      {!contractsConfigured && (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Contracts aren&apos;t configured yet, so this panel runs the exact same matching logic in
          your browser (the TypeScript mirror of <code className="font-mono">PayeeRegistry.checkPayee</code>).
          After deploy, verdicts come straight from the chain.
        </p>
      )}
    </div>
  );
}

"use client";

import { Fingerprint, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useAccount,
  useContractRead,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { Button, LevelBadge, PanelHeader } from "@/components/ui/kit";
import { WalletButton } from "@/components/shared/WalletButton";
import { explainTxError, shortAddr } from "@/lib/format";
import { toast } from "@/lib/store/toast";
import { REGISTRY_ABI } from "@/lib/web3/abis";
import { REGISTRY_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";

export function RegistryPanel({ prefill }: { prefill?: string }) {
  const { address: me } = useAccount();
  const [myName, setMyName] = useState("");
  const [attestAddr, setAttestAddr] = useState("");
  const [attestName, setAttestName] = useState("");
  const [revokeName, setRevokeName] = useState("");
  const [awaiting, setAwaiting] = useState<"register" | "attest" | "revoke" | null>(null);
  const [view, setView] = useState<"identity" | "verifier">(prefill === "attest" ? "verifier" : "identity");

  const { writeContract, data: hash, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: identity } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "payeeOf",
    args: [me as `0x${string}`],
    query: { enabled: !!me && contractsConfigured },
  });
  const { data: isVerifier } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "isVerifier",
    args: [me as `0x${string}`],
    query: { enabled: !!me && contractsConfigured },
  });
  const { data: verifiers, refetch: refetchVerifiers } = useContractRead({
    abi: REGISTRY_ABI,
    address: REGISTRY_ADDRESS,
    functionName: "verifiers",
    query: { enabled: contractsConfigured },
  });

  const myDisplayName = identity?.[0] ?? "";
  const registered = identity ? Boolean(identity[1]) : false;
  const myLevel = identity ? Number(identity[2]) : 0;
  const focus = prefill === "register" ? "identity" : prefill === "attest" ? "attest" : null;

  useEffect(() => {
    if (focus === "identity" && myDisplayName) setMyName(myDisplayName);
  }, [focus, myDisplayName]);

  const submit = (fn: () => void, kind: "register" | "attest" | "revoke") => {
    setAwaiting(kind);
    fn();
  };

  // tx result handling
  useEffect(() => {
    if (isSuccess && awaiting && !confirming) {
      const msgs: Record<string, string> = {
        register: "Your identity is registered on-chain.",
        attest: "Attestation recorded — the payee now has a verified alternate name.",
        revoke: "Attestation revoked.",
      };
      toast.success("Registry updated", msgs[awaiting], hash);
      setAwaiting(null);
      refetchVerifiers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, confirming, awaiting]);

  useEffect(() => {
    if (error && awaiting) {
      const ex = explainTxError(error);
      toast.error(ex.title, ex.desc);
      setAwaiting(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <div>
      <PanelHeader
        title="Registry"
        desc="Identities live here: self-claimed names by payees, verifier attestations for higher trust. Every write is an on-chain event."
      />

      {/* Segmented tabs — one job at a time, instead of a long stacked page */}
      <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(
          [
            { id: "identity", label: "Your identity", icon: Fingerprint },
            { id: "verifier", label: "Verifier tools", icon: ShieldCheck },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              view === t.id
                ? "bg-gradient-to-r from-neon-caramel/20 to-neon-caramel/20 text-white shadow-glow-caramel"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.id === "verifier" && isVerifier && (
              <span className="rounded-full bg-neon-caramel/20 px-1.5 py-0.5 text-[9px] text-neon-caramel">you</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid max-w-2xl gap-5">
        {/* Identity card */}
        {view === "identity" && (
        <div className={`glass rounded-2xl p-5 ${focus === "identity" ? "ring-1 ring-neon-caramel/50" : ""}`}>
          <div className="mb-4 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-neon-caramel" />
            <h3 className="font-display text-sm font-semibold text-white">Your identity</h3>
            {registered && <LevelBadge level={myLevel} />}
          </div>
          {me && contractsConfigured ? (
            <>
              {registered && (
                <p className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200">
                  “{myDisplayName}” <span className="ml-2 text-[11px] text-slate-500">({shortAddr(me)})</span>
                </p>
              )}
              <label className="mb-1 block text-xs text-slate-400">
                {registered ? "Update display name" : "Claim a display name"}
              </label>
              <input
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder='Your Name here'
                className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-neon-caramel/60"
              />
              <Button
                className="mt-3"
                disabled={!myName.trim()}
                loading={awaiting === "register"}
                onClick={() =>
                  submit(
                    () =>
                      writeContract({
                        abi: REGISTRY_ABI,
                        address: REGISTRY_ADDRESS,
                        functionName: "registerPayee",
                        args: [myName],
                      }),
                    "register"
                  )
                }
              >
                {registered ? "Update identity" : "Register identity"}
              </Button>
            </>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-slate-500">Connect your wallet on the QDay network to manage identity.</p>
              <div>
                <WalletButton compact />
              </div>
            </div>
          )}
        </div>
        )}

        {/* Verifier tools */}
        {view === "verifier" && (
        <div className={`glass rounded-2xl p-5 ${focus === "attest" ? "ring-1 ring-neon-caramel/50" : ""}`}>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-neon-caramel" />
            <h3 className="font-display text-sm font-semibold text-white">Verifier tools</h3>
            {isVerifier && (
              <span className="rounded-md border border-neon-caramel/40 bg-neon-caramel/10 px-2 py-0.5 text-[10px] text-neon-caramel">
                you are a verifier
              </span>
            )}
          </div>
          {me && isVerifier ? (
            <div className="grid gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Attest an identity</p>
                <div className="grid gap-2">
                  <input
                    value={attestAddr}
                    onChange={(e) => setAttestAddr(e.target.value)}
                    placeholder="0x… payee address"
                    spellCheck={false}
                    className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-neon-caramel/60"
                  />
                  <input
                    value={attestName}
                    onChange={(e) => setAttestName(e.target.value)}
                    placeholder='verified name, e.g. "BS Mart"'
                    className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-neon-caramel/60"
                  />
                </div>
                <Button
                  variant="subtle"
                  className="mt-3"
                  disabled={!attestAddr.trim() || !attestName.trim()}
                  loading={awaiting === "attest"}
                  onClick={() =>
                    submit(
                      () =>
                        writeContract({
                          abi: REGISTRY_ABI,
                          address: REGISTRY_ADDRESS,
                          functionName: "attest",
                          args: [attestAddr as `0x${string}`, attestName],
                        }),
                      "attest"
                    )
                  }
                >
                  Attest
                </Button>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Revoke an attestation</p>
                <div className="grid gap-2">
                  <input
                    value={revokeName}
                    onChange={(e) => setRevokeName(e.target.value)}
                    placeholder="name to revoke"
                    className="w-full rounded-xl border border-white/10 bg-ink-800/70 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-neon-red/60"
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={!revokeName.trim()}
                    loading={awaiting === "revoke"}
                    onClick={() =>
                      submit(
                        () =>
                          writeContract({
                            abi: REGISTRY_ABI,
                            address: REGISTRY_ADDRESS,
                            functionName: "revokeAttestation",
                            args: [attestAddr as `0x${string}`, revokeName],
                          }),
                        "revoke"
                      )
                    }
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-500">
              Verifiers endorse <span className="font-mono text-xs">address → name</span> pairs — a
              federated trust model (KYC providers, DAOs, marketplaces). The deployer is the first
              verifier; additional verifiers are added by the contract owner.
            </p>
          )}

          {verifiers && (verifiers as `0x${string}`[]).length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
                <Users className="h-3.5 w-3.5" /> Verifiers
              </p>
              <div className="flex flex-wrap gap-2">
                {(verifiers as `0x${string}`[]).map((v) => (
                  <span key={v} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                    {shortAddr(v, 6)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

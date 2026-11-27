"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPublicClient, http } from "viem";
import { qdayAevum } from "@/lib/web3/chain";
import { GUARD_ADDRESS, REGISTRY_ADDRESS, contractsConfigured } from "@/lib/web3/addresses";
import {
  DEPLOY_BLOCK,
  RPC_URL,
  fetchRawLogs,
  mapRawToRows,
  mergeRows,
  type AuditRow,
} from "@/lib/audit/trail";

export interface AuditTrailState {
  rows: AuditRow[];
  live: boolean;
  loading: boolean;
  error: string | null;
  scanned: bigint;
  totalToScan: bigint;
}

const AuditContext = createContext<AuditTrailState>({
  rows: [],
  live: false,
  loading: true,
  error: null,
  scanned: 0n,
  totalToScan: 0n,
});

export function useAuditTrail(): AuditTrailState {
  return useContext(AuditContext);
}

/** Scans the chain once (from the deployment block) and polls for new logs.
 *  Mounted once by DashboardShell so Overview + Audit share one scan. */
export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<bigint>(0n);
  const [totalToScan, setTotalToScan] = useState<bigint>(0n);
  const seen = useRef<Set<string>>(new Set());
  const scannedHead = useRef<bigint>(0n);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!contractsConfigured) return;
    let stop = false;

    async function fillTimestamps(client: ReturnType<typeof createPublicClient>, incoming: AuditRow[]): Promise<AuditRow[]> {
      const blocks = [...new Set(incoming.filter((r) => !r.ts).map((r) => r.blockNumber))];
      if (blocks.length === 0) return incoming;
      const tsByBlock = new Map<bigint, number>();
      for (let i = 0; i < blocks.length; i += 10) {
        const batch = blocks.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map((b) => client.getBlock({ blockNumber: b })),
        );
        results.forEach((r, j) => {
          if (r.status === "fulfilled" && r.value?.timestamp) {
            tsByBlock.set(batch[j], Number(r.value.timestamp));
          }
        });
        if (stop) break;
      }
      return incoming.map((r) => (r.ts ? r : { ...r, ts: tsByBlock.get(r.blockNumber) ?? 0 }));
    }

    async function boot() {
      try {
        const client = createPublicClient({ chain: qdayAevum, transport: http(RPC_URL) });

        const head = await client.getBlockNumber();
        const from = DEPLOY_BLOCK > head ? 0n : DEPLOY_BLOCK;
        // Two contracts are scanned in parallel, so total = 2x the range.
        setTotalToScan((head - from + 1n) * 2n);
        setScanned(0n);

        let doneBlocks = 0n;
        const onProgress = (chunkSize: bigint) => {
          doneBlocks += chunkSize;
          if (!stop) setScanned(doneBlocks);
        };

        const [guardRes, registryRes] = await Promise.all([
          fetchRawLogs(GUARD_ADDRESS, from, head, onProgress),
          fetchRawLogs(REGISTRY_ADDRESS, from, head, onProgress),
        ]);
        if (stop) return;

        const failed = guardRes.failedChunks + registryRes.failedChunks;
        if (guardRes.logs.length === 0 && registryRes.logs.length === 0 && failed > 0) {
          setError(`Could not read chain events (${failed} log chunk(s) failed). The RPC may be rate-limiting eth_getLogs — try refreshing.`);
          setLoading(false);
          return;
        }

        const mapped = mapRawToRows([...guardRes.logs, ...registryRes.logs]);
        const withTs = await fillTimestamps(client, mapped);
        if (stop) return;
        setRows((r) => mergeRows(r, withTs, seen.current));
        scannedHead.current = head;
        setScanned((head - from + 1n) * 2n);
        setLoading(false);
        setLive(true);

        // Poll for new logs only (not a full rescan) every 30s.
        if (stop) return;
        pollRef.current = setInterval(async () => {
          try {
            const newHead = await client.getBlockNumber();
            const pollFrom = scannedHead.current + 1n;
            if (newHead < pollFrom) return;
            const [g, r] = await Promise.all([
              fetchRawLogs(GUARD_ADDRESS, pollFrom, newHead),
              fetchRawLogs(REGISTRY_ADDRESS, pollFrom, newHead),
            ]);
            if (stop) return;
            const fresh = mapRawToRows([...g.logs, ...r.logs]);
            if (fresh.length === 0) {
              scannedHead.current = newHead;
              return;
            }
            const freshWithTs = await fillTimestamps(client, fresh);
            if (stop) return;
            setRows((prev) => mergeRows(prev, freshWithTs, seen.current));
            scannedHead.current = newHead;
          } catch (e) {
            console.error("AuditPanel poll failed:", e);
          }
        }, 30000);
      } catch (e) {
        console.error("AuditPanel boot failed:", e);
        if (!stop) {
          setError(e instanceof Error ? e.message : "Failed to scan the chain for events.");
          setLoading(false);
        }
      }
    }

    boot();
    return () => {
      stop = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuditContext.Provider value={{ rows, live, loading, error, scanned, totalToScan }}>
      {children}
    </AuditContext.Provider>
  );
}

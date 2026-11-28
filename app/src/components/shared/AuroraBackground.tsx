"use client";

import { useMemo } from "react";

/**
 * Living background: three slow-drifting aurora blobs + rising dust particles.
 * `calm` is the dashboard variant — dimmer, fewer particles, so data stays
 * readable. Pure CSS animations; disabled automatically by the global
 * prefers-reduced-motion rule in globals.css.
 */
export function AuroraBackground({ calm = false }: { calm?: boolean }) {
  const particles = useMemo(() => {
    const count = calm ? 10 : 22;
    return Array.from({ length: count }, (_, i) => {
      // Deterministic pseudo-random placement (stable across renders).
      const seed = (i * 2654435761) % 1000 / 1000;
      const seed2 = (i * 40503 + 7) % 1000 / 1000;
      return {
        left: `${(seed * 100).toFixed(1)}%`,
        bottom: `${(seed2 * 30 - 5).toFixed(1)}%`,
        size: seed > 0.7 ? 3 : 2,
        duration: `${14 + seed * 18}s`,
        delay: `${-seed2 * 24}s`,
        cyan: seed2 > 0.5,
      };
    });
  }, [calm]);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Aurora blobs — strong enough to read as flowing bands, not a flat tint */}
      <div
        className={`animate-aurora-a absolute -top-24 left-[4%] h-[480px] w-[620px] rounded-full bg-neon-cyan/40 blur-[90px] ${
          calm ? "opacity-50" : ""
        }`}
      />
      <div
        className={`animate-aurora-b absolute right-[-4%] top-[28%] h-[520px] w-[640px] rounded-full bg-neon-violet/40 blur-[100px] ${
          calm ? "opacity-50" : ""
        }`}
      />
      <div
        className={`animate-aurora-c absolute bottom-[-8%] left-[28%] h-[420px] w-[540px] rounded-full bg-neon-green/25 blur-[100px] ${
          calm ? "opacity-40" : ""
        }`}
      />
      {/* Rising dust particles */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="animate-particle-rise absolute rounded-full"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            background: p.cyan ? "#22d3ee" : "#a78bfa",
            boxShadow: p.cyan
              ? "0 0 6px 1px rgba(34,211,238,0.7)"
              : "0 0 6px 1px rgba(167,139,250,0.7)",
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

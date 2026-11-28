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
      {/* Aurora bands — wide, elongated gradients with a visible color core,
          so they read as flowing ribbons rather than a faint diffuse glow */}
      <div
        className={`animate-aurora-a absolute -top-16 left-[-6%] h-[240px] w-[1100px] rounded-full blur-[55px] ${
          calm ? "opacity-40" : ""
        }`}
        style={{
          background:
            "linear-gradient(100deg, transparent 0%, rgba(34,211,238,0.55) 30%, rgba(34,211,238,0.35) 55%, transparent 85%)",
        }}
      />
      <div
        className={`animate-aurora-b absolute right-[-10%] top-[24%] h-[220px] w-[1000px] rounded-full blur-[60px] ${
          calm ? "opacity-40" : ""
        }`}
        style={{
          background:
            "linear-gradient(100deg, transparent 0%, rgba(139,92,246,0.55) 35%, rgba(139,92,246,0.3) 60%, transparent 90%)",
        }}
      />
      <div
        className={`animate-aurora-c absolute bottom-[-6%] left-[24%] h-[200px] w-[900px] rounded-full blur-[60px] ${
          calm ? "opacity-30" : ""
        }`}
        style={{
          background:
            "linear-gradient(100deg, transparent 0%, rgba(52,211,153,0.35) 30%, rgba(34,211,238,0.28) 60%, transparent 88%)",
        }}
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

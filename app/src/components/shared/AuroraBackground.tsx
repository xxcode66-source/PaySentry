"use client";

import { useMemo } from "react";

/**
 * Living background, simplified: ONE soft cyan glow + rising cyan dust.
 * No competing violet/emerald bands — a single calm accent so the page
 * reads smooth instead of busy. `calm` is the dashboard variant — dimmer,
 * fewer particles, so data stays readable. Pure CSS animations; disabled
 * automatically by the global prefers-reduced-motion rule in globals.css.
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
      };
    });
  }, [calm]);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Single soft cyan glow, slowly drifting */}
      <div
        className={`animate-aurora-a absolute -top-24 left-[10%] h-[260px] w-[900px] rounded-full blur-[70px] ${
          calm ? "opacity-50" : ""
        }`}
        style={{
          background:
            "linear-gradient(100deg, transparent 0%, rgba(34,211,238,0.32) 35%, rgba(34,211,238,0.18) 60%, transparent 85%)",
        }}
      />
      {/* Rising cyan dust particles */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="animate-particle-rise absolute rounded-full"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            background: "#22d3ee",
            boxShadow: "0 0 6px 1px rgba(34,211,238,0.7)",
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

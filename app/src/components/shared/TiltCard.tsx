"use client";

import { useRef, useState } from "react";

/**
 * 3D tilt-on-hover card with a pointer-following glare.
 * - `max` caps the tilt angle (identity card 7°, asset cards 4°).
 * - Disabled on touch devices and when the user prefers reduced motion:
 *   the card then renders as a plain div.
 */
export function TiltCard({
  children,
  className = "",
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ rx: number; ry: number; gx: number; gy: number } | null>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    if (e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setStyle({
      rx: (0.5 - py) * max * 2,
      ry: (px - 0.5) * max * 2,
      gx: px * 100,
      gy: py * 100,
    });
  }

  function onLeave() {
    setStyle(null);
  }

  return (
    <div style={{ perspective: "1000px" }} className={className}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-full transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: style
            ? `rotateX(${style.rx.toFixed(2)}deg) rotateY(${style.ry.toFixed(2)}deg) scale(1.015)`
            : "rotateX(0deg) rotateY(0deg) scale(1)",
          transformStyle: "preserve-3d",
        }}
      >
        {children}
        {/* pointer glare — strong enough to read in a still screenshot */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] transition-opacity duration-200"
          style={{ opacity: style ? 1 : 0 }}
          aria-hidden
        >
          <div
            className="absolute h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${style?.gx ?? 50}%`,
              top: `${style?.gy ?? 50}%`,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(34,211,238,0.07) 42%, transparent 68%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

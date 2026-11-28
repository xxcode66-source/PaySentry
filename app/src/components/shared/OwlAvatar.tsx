"use client";

/**
 * Cute owl avatar — a little watchful sentry for the identity card.
 * Pure SVG + CSS: it blinks every few seconds and bobs gently on its own,
 * no WebGL, so it animates the same in every browser.
 */
export function OwlAvatar({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${
        dimmed ? "opacity-50" : ""
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" className="animate-owl-bob h-[88%] w-[88%]">
        {/* ear tufts */}
        <path d="M15 16 L19 5 L25 13 Z" fill="#7c4a21" />
        <path d="M49 16 L45 5 L39 13 Z" fill="#7c4a21" />
        {/* body */}
        <ellipse cx="32" cy="37" rx="19" ry="21" fill="#8a5a33" />
        {/* wings */}
        <ellipse cx="14.5" cy="39" rx="4" ry="8.5" fill="#6f3f1d" transform="rotate(-12 14.5 39)" />
        <ellipse cx="49.5" cy="39" rx="4" ry="8.5" fill="#6f3f1d" transform="rotate(12 49.5 39)" />
        {/* belly */}
        <ellipse cx="32" cy="45" rx="11" ry="11" fill="#f2d8a7" opacity="0.92" />
        {/* eyes — each blinks */}
        <g className="animate-owl-blink">
          <circle cx="24" cy="30" r="7.5" fill="#fff7e8" />
          <circle cx="25" cy="31" r="3.2" fill="#2a1a0e" />
          <circle cx="26.2" cy="29.2" r="1.1" fill="#ffffff" />
        </g>
        <g className="animate-owl-blink">
          <circle cx="40" cy="30" r="7.5" fill="#fff7e8" />
          <circle cx="39" cy="31" r="3.2" fill="#2a1a0e" />
          <circle cx="40.2" cy="29.2" r="1.1" fill="#ffffff" />
        </g>
        {/* blush */}
        <circle cx="16.5" cy="39" r="2.4" fill="#e8a85c" opacity="0.4" />
        <circle cx="47.5" cy="39" r="2.4" fill="#e8a85c" opacity="0.4" />
        {/* beak */}
        <path d="M29 38 L35 38 L32 43 Z" fill="#e8a85c" />
        {/* feet */}
        <ellipse cx="25" cy="57.5" rx="3" ry="1.6" fill="#e8a85c" />
        <ellipse cx="39" cy="57.5" rx="3" ry="1.6" fill="#e8a85c" />
      </svg>
    </div>
  );
}

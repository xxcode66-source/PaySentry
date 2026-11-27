"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Copy, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useToastStore } from "@/lib/store/toast";

// ---------------------------------------------------------------- Button

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "outline" | "subtle";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60 disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };
  const variants = {
    primary:
      "bg-neon-cyan text-ink font-semibold hover:bg-cyan-300 hover:shadow-glow-cyan active:scale-[0.98]",
    ghost: "text-slate-300 hover:text-white hover:bg-white/5",
    danger:
      "bg-gradient-to-r from-neon-red to-rose-600 text-white font-semibold hover:shadow-glow-red active:scale-[0.98]",
    outline:
      "border border-white/15 text-slate-200 hover:border-neon-cyan/60 hover:text-neon-cyan hover:bg-neon-cyan/5",
    subtle: "bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Card

export function Card({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "cyan" | "violet" | "none";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`glass rounded-2xl ${
        glow === "cyan" ? "shadow-glow-cyan" : glow === "violet" ? "shadow-glow-violet" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------- VerdictPill

const VERDICT_STYLES: Record<number, string> = {
  0: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  1: "bg-neon-red/10 text-neon-red border-neon-red/40",
  2: "bg-neon-amber/10 text-neon-amber border-neon-amber/40",
  3: "bg-neon-green/10 text-neon-green border-neon-green/40",
};
const VERDICT_LABELS: Record<number, string> = {
  0: "NOT FOUND",
  1: "NO MATCH",
  2: "CLOSE MATCH",
  3: "FULL MATCH",
};
export const VERDICT_GLOW: Record<number, string> = {
  0: "",
  1: "shadow-glow-red",
  2: "",
  3: "shadow-glow-green",
};

export function VerdictPill({
  result,
  size = "md",
  animate = true,
}: {
  result: number | undefined;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}) {
  if (result === undefined) return null;
  const sizes = {
    sm: "px-2 py-0.5 text-[10px] tracking-wider",
    md: "px-3 py-1 text-xs tracking-wider",
    lg: "px-5 py-2.5 text-sm tracking-[0.2em] font-bold",
  };
  const Comp = animate ? motion.span : "span";
  const motionProps = animate
    ? ({
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: "spring", stiffness: 300, damping: 18 },
      } as const)
    : {};
  return (
    <Comp
      {...motionProps}
      className={`inline-flex items-center rounded-full border font-semibold ${VERDICT_STYLES[result]} ${sizes[size]}`}
    >
      {result === 3 && <Check className="h-3.5 w-3.5 mr-1.5" />}
      {result === 2 && <span className="mr-1.5">⚠</span>}
      {result === 1 && <X className="h-3.5 w-3.5 mr-1.5" />}
      {VERDICT_LABELS[result]}
    </Comp>
  );
}

export function LevelBadge({ level }: { level: number }) {
  const map: Record<number, { label: string; cls: string }> = {
    0: { label: "Unknown", cls: "bg-white/5 text-slate-400 border-white/10" },
    1: { label: "Self-claimed", cls: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30" },
    2: { label: "Attested", cls: "bg-neon-violet/10 text-neon-violet border-neon-violet/40" },
  };
  const m = map[level] ?? map[0];
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ---------------------------------------------------------------- Inputs

export function TextInput({
  value,
  onChange,
  placeholder,
  label,
  hint,
  mono,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-white/10 bg-ink-800/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-neon-cyan/60 focus:bg-ink-800 ${
          mono ? "font-mono text-xs" : ""
        }`}
      />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- CopyButton

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
    >
      {copied ? <Check className="h-3 w-3 text-neon-green" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

// ---------------------------------------------------------------- StepLink

export function StepLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-neon-cyan transition hover:gap-2 hover:text-white"
    >
      {children} <ChevronRight className="h-3.5 w-3.5" />
    </a>
  );
}

// ---------------------------------------------------------------- ToastHost

const TOAST_ICON: Record<string, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

export function ToastHost() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="glass-strong pointer-events-auto cursor-pointer rounded-xl p-3.5 shadow-xl"
            onClick={() => dismiss(t.id)}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  t.kind === "success"
                    ? "bg-neon-green/20 text-neon-green"
                    : t.kind === "error"
                      ? "bg-neon-red/20 text-neon-red"
                      : t.kind === "warning"
                        ? "bg-neon-amber/20 text-neon-amber"
                        : "bg-neon-cyan/20 text-neon-cyan"
                }`}
              >
                {TOAST_ICON[t.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{t.title}</p>
                {t.desc && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{t.desc}</p>}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- Section header

export function PanelHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-7 border-b border-white/10 pb-4">
      <div className="flex items-center gap-3">
        <span className="h-7 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-neon-cyan to-neon-violet" />
        <div>
          <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-sm text-slate-300">{desc}</p>
        </div>
      </div>
    </div>
  );
}

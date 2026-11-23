import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#05070d",
          900: "#0a0e1a",
          800: "#101627",
          700: "#1a2138",
          600: "#263050",
        },
        neon: {
          cyan: "#22d3ee",
          violet: "#8b5cf6",
          green: "#34d399",
          amber: "#fbbf24",
          red: "#f87171",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-cyan": "0 0 24px rgba(34,211,238,0.25), 0 0 64px rgba(34,211,238,0.08)",
        "glow-violet": "0 0 24px rgba(139,92,246,0.25), 0 0 64px rgba(139,92,246,0.10)",
        "glow-red": "0 0 24px rgba(248,113,113,0.3)",
        "glow-green": "0 0 24px rgba(52,211,153,0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2.2s linear infinite",
        float: "float 7s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

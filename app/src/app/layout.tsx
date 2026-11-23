import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ToastHost } from "@/components/ui/kit";
import { Web3Providers } from "@/lib/web3/providers";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PaySentry — Trustless Confirmation of Payee",
  description:
    "Check first, pay second. An on-chain Confirmation-of-Payee layer for stablecoin payments and AI agents, built on QDay Aevum. Zero backend, zero databases.",
  keywords: [
    "confirmation of payee",
    "stablecoin payments",
    "qday",
    "aevum testnet",
    "AI agent payments",
    "ERC-8004",
  ],
  openGraph: {
    title: "PaySentry — Trustless Confirmation of Payee",
    description:
      "On-chain payee verification, guarded payments and bounded agent sessions for the agentic economy.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} dark`}>
      <body className="font-body">
        <Web3Providers>{children}</Web3Providers>
        <ToastHost />
      </body>
    </html>
  );
}

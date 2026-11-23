"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, walletConnect } from "wagmi/connectors";
import { createConfig, http, WagmiProvider } from "wagmi";
import { qdayAevum, RPC_URL } from "./chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const connectors = projectId
  ? [injected(), walletConnect({ projectId, showQrModal: false })]
  : [injected()];

const config = createConfig({
  chains: [qdayAevum],
  connectors,
  transports: { [qdayAevum.id]: http(RPC_URL) },
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  webpack: (config) => {
    // @wagmi/connectors → @coinbase/cdp-sdk pulls @x402/* (Coinbase x402 stack).
    // We only use EVM paths; stub the Solana (@x402/svm) subtree which ships
    // broken/missing from that package chain. These modules are never executed.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@x402/svm": false,
      "@x402/svm/exact/client": false,
      "@x402/svm/exact/server": false,
      "@x402/svm/exact/v1/client": false,
      "@x402/svm/upto/client": false,
      "@x402/svm/upto/server": false,
    };
    return config;
  },
};

export default nextConfig;

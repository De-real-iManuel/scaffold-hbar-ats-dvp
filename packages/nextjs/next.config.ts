import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Polyfill Node.js modules for browser compatibility with wagmi/viem
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Stub out optional peer dependencies of @coinbase/cdp-sdk that are not
    // installed. These packages (@x402/*) are only needed for x402 payment
    // features which this app does not use. Without these aliases the Next.js
    // webpack bundler will fail with "Module not found" errors when it walks
    // the @wagmi/connectors → @base-org/account → @coinbase/cdp-sdk import
    // chain and hits the missing optional deps.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm": false,
      "@x402/core": false,
      "@x402/svm": false,
      "@x402/extensions": false,
    };

    return config;
  },
};

export default nextConfig;

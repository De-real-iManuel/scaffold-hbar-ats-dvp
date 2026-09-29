"use client";

import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";

// Hedera Testnet — chainId 296
export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: {
    name: "HBAR",
    symbol: "HBAR",
    decimals: 8,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.hashio.io/api"],
    },
  },
  blockExplorers: {
    default: {
      name: "HashScan",
      url: "https://hashscan.io/testnet",
    },
  },
  testnet: true,
});

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        metaMaskWallet,
        ...(WC_PROJECT_ID ? [walletConnectWallet] : []),
        injectedWallet,
      ],
    },
  ],
  {
    appName: "scaffold-hbar-ats-dvp — DvP Settlement",
    projectId: WC_PROJECT_ID || "placeholder",
  }
);

export const wagmiConfig = createConfig({
  chains: [hederaTestnet],
  connectors,
  transports: {
    [hederaTestnet.id]: http("https://testnet.hashio.io/api"),
  },
  ssr: true,
});

"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface NetworkGuardProps {
  children: React.ReactNode;
}

export function NetworkGuard({ children }: NetworkGuardProps) {
  const { isConnected, chain } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md w-full">
          <p className="text-gray-700 mb-4 text-lg font-medium">
            Connect your wallet to continue
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (chain?.id !== 296) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg shadow p-8 text-center max-w-md w-full">
          <p className="text-yellow-800 text-lg font-semibold mb-2">
            ⚠️ Wrong Network
          </p>
          <p className="text-yellow-700">
            Please switch to{" "}
            <span className="font-semibold">Hedera Testnet (chainId 296)</span>.
            {chain && (
              <span className="block text-sm mt-1 text-yellow-600">
                Currently connected to: {chain.name}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { useAccount } from "wagmi";
import { useTokenBalances } from "~/hooks/useTokenBalances";
import { formatTokenAmount } from "~/lib/formatters";
import { getAtsTokenAddress, getPaymentTokenAddress } from "~/lib/contracts";

// Token decimals are fixed constants — never fetched to avoid bigint/float issues
const ATS_DECIMALS = 18;
const PAYMENT_DECIMALS = 6;

export function TokenBalances() {
  const { address, isConnected } = useAccount();
  const { atsBalance, paymentBalance, isLoading } = useTokenBalances(address);

  const atsAddress = getAtsTokenAddress();
  const paymentAddress = getPaymentTokenAddress();

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Token Balances</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-medium text-gray-600">ATS Token</span>
            <p className="text-gray-400 font-mono text-xs break-all">{atsAddress}</p>
          </div>
          <span className="ml-4 font-mono text-gray-800">
            {isConnected
              ? isLoading
                ? "..."
                : formatTokenAmount(atsBalance, ATS_DECIMALS)
              : "—"}
          </span>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <span className="font-medium text-gray-600">Payment Token</span>
            <p className="text-gray-400 font-mono text-xs break-all">{paymentAddress}</p>
          </div>
          <span className="ml-4 font-mono text-gray-800">
            {isConnected
              ? isLoading
                ? "..."
                : formatTokenAmount(paymentBalance, PAYMENT_DECIMALS)
              : "—"}
          </span>
        </div>
      </div>

      {!isConnected && (
        <p className="text-gray-500 text-sm italic">Connect wallet to see balances</p>
      )}
    </div>
  );
}

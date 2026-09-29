"use client";

import { useReadContracts } from "wagmi";
import { getAtsTokenAddress, getPaymentTokenAddress } from "~/lib/contracts";

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useTokenBalances(account: string | undefined) {
  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: getAtsTokenAddress(),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: account ? [account as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
      },
      {
        address: getPaymentTokenAddress(),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: account ? [account as `0x${string}`] : ["0x0000000000000000000000000000000000000000"],
      },
    ],
    query: {
      enabled: !!account,
    },
  });

  const atsBalance = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const paymentBalance = (data?.[1]?.result as bigint | undefined) ?? 0n;

  return { atsBalance, paymentBalance, isLoading };
}

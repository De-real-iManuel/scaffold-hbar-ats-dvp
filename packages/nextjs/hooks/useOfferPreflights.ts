"use client";

import { useReadContracts } from "wagmi";
import { getDvPAddress, getPaymentTokenAddress } from "~/lib/contracts";

const erc20Abi = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

interface UseOfferPreflightsParams {
  buyer: string | undefined;
  paymentAmount: bigint;
  offerId?: bigint;
}

interface UseOfferPreflightsResult {
  /**
   * Whether the buyer has approved at least paymentAmount to DvPSettlement.
   * null = unable to determine (not connected or read failed).
   */
  allowanceSufficient: boolean | null;
  /**
   * Whether the buyer holds at least paymentAmount of the payment token.
   * null = unable to determine.
   */
  balanceSufficient: boolean | null;
  /**
   * ATS eligibility check: always null.
   * ATS eligibility is not readable without ATS-specific ABI methods
   * (e.g. isAuthorized / isEligible on the ATS token contract).
   * This must be verified off-chain or via a dedicated ATS SDK call.
   */
  eligible: null;
}

export function useOfferPreflights({
  buyer,
  paymentAmount,
}: UseOfferPreflightsParams): UseOfferPreflightsResult {
  const dvpAddress = getDvPAddress();
  const paymentTokenAddress = getPaymentTokenAddress();

  const { data } = useReadContracts({
    contracts: [
      {
        address: paymentTokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: buyer
          ? [buyer as `0x${string}`, dvpAddress]
          : ["0x0000000000000000000000000000000000000000", dvpAddress],
      },
      {
        address: paymentTokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: buyer
          ? [buyer as `0x${string}`]
          : ["0x0000000000000000000000000000000000000000"],
      },
    ],
    query: {
      enabled: !!buyer,
    },
  });

  if (!buyer || !data) {
    return { allowanceSufficient: null, balanceSufficient: null, eligible: null };
  }

  const allowance = data[0]?.result as bigint | undefined;
  const balance = data[1]?.result as bigint | undefined;

  const allowanceSufficient =
    allowance !== undefined ? allowance >= paymentAmount : null;
  const balanceSufficient =
    balance !== undefined ? balance >= paymentAmount : null;

  return { allowanceSufficient, balanceSufficient, eligible: null };
}

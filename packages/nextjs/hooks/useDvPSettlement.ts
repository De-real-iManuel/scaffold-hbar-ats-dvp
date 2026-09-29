"use client";

import { useWriteContract } from "wagmi";
import { getDvPAddress } from "~/lib/contracts";

const DvPSettlementAbi = [
  {
    name: "createOffer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "buyer", type: "address" },
      { name: "assetAmount", type: "uint256" },
      { name: "paymentAmount", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
    outputs: [{ name: "offerId", type: "uint256" }],
  },
  {
    name: "acceptOffer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "offerId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelOffer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "offerId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "offers",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "offerId", type: "uint256" }],
    outputs: [
      { name: "id", type: "uint256" },
      { name: "seller", type: "address" },
      { name: "buyer", type: "address" },
      { name: "assetAmount", type: "uint256" },
      { name: "paymentAmount", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    name: "atsAsset",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "paymentToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "OfferCreated",
    type: "event",
    inputs: [
      { indexed: true, name: "offerId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "buyer", type: "address" },
      { name: "assetAmount", type: "uint256" },
      { name: "paymentAmount", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
  },
  {
    name: "OfferSettled",
    type: "event",
    inputs: [
      { indexed: true, name: "offerId", type: "uint256" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "buyer", type: "address" },
      { name: "assetAmount", type: "uint256" },
      { name: "paymentAmount", type: "uint256" },
    ],
  },
  {
    name: "OfferCancelled",
    type: "event",
    inputs: [{ indexed: true, name: "offerId", type: "uint256" }],
  },
] as const;

export { DvPSettlementAbi };

export function useDvPSettlement() {
  const { writeContractAsync, isPending, isSuccess, isError, data: hash } = useWriteContract();

  async function createOffer(
    buyer: string,
    assetAmount: bigint,
    paymentAmount: bigint,
    expiry: bigint
  ): Promise<void> {
    await writeContractAsync({
      address: getDvPAddress(),
      abi: DvPSettlementAbi,
      functionName: "createOffer",
      args: [buyer as `0x${string}`, assetAmount, paymentAmount, expiry],
    });
  }

  async function acceptOffer(offerId: bigint): Promise<void> {
    await writeContractAsync({
      address: getDvPAddress(),
      abi: DvPSettlementAbi,
      functionName: "acceptOffer",
      args: [offerId],
    });
  }

  async function cancelOffer(offerId: bigint): Promise<void> {
    await writeContractAsync({
      address: getDvPAddress(),
      abi: DvPSettlementAbi,
      functionName: "cancelOffer",
      args: [offerId],
    });
  }

  return {
    createOffer,
    acceptOffer,
    cancelOffer,
    isPending,
    isSuccess,
    isError,
    hash: hash as `0x${string}` | undefined,
  };
}

"use client";

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useDvPSettlement, DvPSettlementAbi } from "~/hooks/useDvPSettlement";
import { useOfferPreflights } from "~/hooks/useOfferPreflights";
import { TransactionStatus } from "~/components/TransactionStatus";
import { formatTokenAmount, formatExpiry } from "~/lib/formatters";
import { getDvPAddress, getPaymentTokenAddress } from "~/lib/contracts";

// Token decimals are fixed constants — never floating-point
const ATS_DECIMALS = 18;
const PAYMENT_DECIMALS = 6;

// Offer status enum (mirrors DvPSettlement.sol)
const OfferStatus: Record<number, string> = {
  0: "Open",
  1: "Filled",
  2: "Cancelled",
};

const erc20Abi = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface OfferViewProps {
  offerId: bigint;
}

function PreflightRow({
  label,
  value,
}: {
  label: string;
  value: boolean | null;
}) {
  const text =
    value === null
      ? "unable to determine"
      : value
      ? "✅ sufficient"
      : "⚠️ insufficient";
  const cls =
    value === null
      ? "text-gray-500"
      : value
      ? "text-green-700"
      : "text-yellow-700";

  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className={cls}>{text}</span>
    </div>
  );
}

export function OfferView({ offerId }: OfferViewProps) {
  const { address: currentUser } = useAccount();

  // Read offer from contract
  const {
    data: offerData,
    isLoading: offerLoading,
    refetch: refetchOffer,
  } = useReadContract({
    address: getDvPAddress(),
    abi: DvPSettlementAbi,
    functionName: "offers",
    args: [offerId],
  });

  // DvP write operations (accept / cancel)
  const {
    acceptOffer,
    cancelOffer,
    isPending: dvpPending,
    isSuccess: dvpSuccess,
    isError: dvpError,
    hash: dvpHash,
  } = useDvPSettlement();

  // ERC-20 approve for buyer
  const {
    writeContractAsync: approveAsync,
    isPending: approvePending,
    isSuccess: approveSuccess,
    isError: approveError,
    data: approveHash,
  } = useWriteContract();

  const [actionError, setActionError] = useState<string | undefined>();

  // Destructure offer tuple
  const offer = offerData as
    | [bigint, `0x${string}`, `0x${string}`, bigint, bigint, bigint, number]
    | undefined;

  const id = offer?.[0];
  const seller = offer?.[1];
  const buyer = offer?.[2];
  const assetAmount = offer?.[3];
  const paymentAmount = offer?.[4];
  const expiry = offer?.[5];
  const status = offer?.[6];

  // Advisory preflights (buyer checks)
  const { allowanceSufficient, balanceSufficient, eligible } = useOfferPreflights({
    buyer: buyer !== ZERO_ADDRESS ? buyer : undefined,
    paymentAmount: paymentAmount ?? 0n,
    offerId,
  });

  // Derived state
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const isExpired = status === 0 && expiry !== undefined && nowSeconds >= expiry;
  const isOfferOpen = status === 0;
  const isBuyer =
    currentUser !== undefined &&
    buyer !== undefined &&
    currentUser.toLowerCase() === buyer.toLowerCase();
  const isSeller =
    currentUser !== undefined &&
    seller !== undefined &&
    currentUser.toLowerCase() === seller.toLowerCase();

  // Not found: id is 0 or seller is zero address
  const notFound =
    !offerLoading &&
    offer !== undefined &&
    (id === 0n || seller === ZERO_ADDRESS);

  async function handleApprove() {
    if (!paymentAmount) return;
    setActionError(undefined);
    try {
      await approveAsync({
        address: getPaymentTokenAddress(),
        abi: erc20Abi,
        functionName: "approve",
        args: [getDvPAddress(), paymentAmount],
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAccept() {
    setActionError(undefined);
    try {
      await acceptOffer(offerId);
      refetchOffer();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCancel() {
    setActionError(undefined);
    try {
      await cancelOffer(offerId);
      refetchOffer();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  if (offerLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Loading offer #{offerId.toString()}...</p>
      </div>
    );
  }

  if (notFound || offer === undefined) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Offer not found (ID: {offerId.toString()})</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">
        Offer #{id?.toString()}
      </h2>

      {/* Offer details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Status</span>
          <span className={status === 0 ? "text-blue-700 font-semibold" : "text-gray-500"}>
            {status !== undefined ? OfferStatus[status] ?? "Unknown" : "—"}
            {isExpired && (
              <span className="ml-2 text-red-600 font-normal">⚠️ Expired</span>
            )}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Seller</span>
          <span className="font-mono text-xs break-all ml-2 text-right">
            {seller}
            {isSeller && <span className="ml-1 text-green-600">(you)</span>}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Buyer</span>
          <span className="font-mono text-xs break-all ml-2 text-right">
            {buyer}
            {isBuyer && <span className="ml-1 text-green-600">(you)</span>}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Asset Amount</span>
          <span className="font-mono">
            {assetAmount !== undefined
              ? formatTokenAmount(assetAmount, ATS_DECIMALS)
              : "—"}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600 font-medium">Payment Amount</span>
          <span className="font-mono">
            {paymentAmount !== undefined
              ? formatTokenAmount(paymentAmount, PAYMENT_DECIMALS)
              : "—"}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-600 font-medium">Expiry</span>
          <span className="text-right ml-2">
            {expiry !== undefined ? formatExpiry(expiry) : "—"}
          </span>
        </div>
      </div>

      {/* Advisory preflights */}
      <div className="bg-gray-50 rounded p-3 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Advisory Checks</h3>
        <PreflightRow label="Payment allowance" value={allowanceSufficient} />
        <PreflightRow label="Payment balance" value={balanceSufficient} />
        <div className="flex justify-between text-sm py-1">
          <span className="text-gray-600">ATS eligibility</span>
          <span className="text-gray-500">
            unable to determine (requires on-chain ATS check)
          </span>
        </div>
        {eligible}
      </div>

      {/* Actions */}
      {isOfferOpen && !isExpired && (
        <div className="space-y-2 pt-2">
          {isBuyer && (
            <>
              <button
                onClick={handleApprove}
                disabled={approvePending || dvpPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {approvePending ? "Approving..." : "Approve exact amount"}
              </button>
              <button
                onClick={handleAccept}
                disabled={dvpPending || approvePending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {dvpPending ? "Accepting..." : "Accept offer"}
              </button>
            </>
          )}

          {isSeller && (
            <button
              onClick={handleCancel}
              disabled={dvpPending}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {dvpPending ? "Cancelling..." : "Cancel offer"}
            </button>
          )}
        </div>
      )}

      {actionError && (
        <p className="text-red-600 text-sm">{actionError}</p>
      )}

      {/* Transaction status for approve */}
      <TransactionStatus
        hash={approveHash as `0x${string}` | undefined}
        isError={approveError}
        errorMessage={approveSuccess ? undefined : actionError}
      />

      {/* Transaction status for accept/cancel */}
      <TransactionStatus
        hash={dvpHash}
        isError={dvpError}
        errorMessage={dvpError ? actionError : undefined}
      />
    </div>
  );
}

// useState is used inside the component — import it here
import { useState } from "react";

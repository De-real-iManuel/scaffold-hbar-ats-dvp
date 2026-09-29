"use client";

import { useState } from "react";
import { useDvPSettlement } from "~/hooks/useDvPSettlement";
import { TransactionStatus } from "~/components/TransactionStatus";

// ATS token has 18 decimals, payment token has 6 — constants, never floating-point
const ATS_DECIMALS = 18n;
const PAYMENT_DECIMALS = 6n;

function parseBigIntUnits(value: string, decimals: bigint): bigint {
  if (!value || value.trim() === "") return 0n;
  const [wholePart, fracPart = ""] = value.split(".");
  const wholeInt = BigInt(wholePart || "0");
  const factor = 10n ** decimals;
  const fracTrunc = fracPart.slice(0, Number(decimals)).padEnd(Number(decimals), "0");
  const fracInt = fracTrunc ? BigInt(fracTrunc) : 0n;
  return wholeInt * factor + fracInt;
}

export function CreateOfferForm() {
  const { createOffer, isPending, isSuccess, isError, hash } = useDvPSettlement();

  const [buyer, setBuyer] = useState("");
  const [assetAmountStr, setAssetAmountStr] = useState("");
  const [paymentAmountStr, setPaymentAmountStr] = useState("");
  const [expiryStr, setExpiryStr] = useState("");
  const [submitError, setSubmitError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(undefined);

    if (!buyer.startsWith("0x")) {
      setSubmitError("Buyer address must start with 0x");
      return;
    }
    if (!assetAmountStr || !paymentAmountStr) {
      setSubmitError("Asset and payment amounts are required");
      return;
    }
    if (!expiryStr) {
      setSubmitError("Expiry is required");
      return;
    }

    const assetAmount = parseBigIntUnits(assetAmountStr, ATS_DECIMALS);
    const paymentAmount = parseBigIntUnits(paymentAmountStr, PAYMENT_DECIMALS);
    const expiryTimestamp = BigInt(Math.floor(new Date(expiryStr).getTime() / 1000));

    if (assetAmount === 0n) {
      setSubmitError("Asset amount must be greater than zero");
      return;
    }
    if (paymentAmount === 0n) {
      setSubmitError("Payment amount must be greater than zero");
      return;
    }
    if (expiryTimestamp <= BigInt(Math.floor(Date.now() / 1000))) {
      setSubmitError("Expiry must be in the future");
      return;
    }

    try {
      await createOffer(buyer, assetAmount, paymentAmount, expiryTimestamp);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError(message);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Create Offer</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buyer Address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asset Amount (ATS tokens, 18 decimals)
          </label>
          <input
            type="text"
            placeholder="e.g. 100.5"
            value={assetAmountStr}
            onChange={(e) => setAssetAmountStr(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Amount (payment tokens, 6 decimals)
          </label>
          <input
            type="text"
            placeholder="e.g. 500.00"
            value={paymentAmountStr}
            onChange={(e) => setPaymentAmountStr(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiry
          </label>
          <input
            type="datetime-local"
            value={expiryStr}
            onChange={(e) => setExpiryStr(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={isPending}
          />
        </div>

        {submitError && (
          <p className="text-red-600 text-sm">{submitError}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Submitting..." : "Create Offer"}
        </button>
      </form>

      <TransactionStatus
        hash={hash}
        isError={isError}
        errorMessage={submitError}
      />

      {isSuccess && (
        <p className="mt-3 text-sm text-gray-600">
          Offer created — check the transaction on HashScan for the offer ID.
        </p>
      )}
    </div>
  );
}

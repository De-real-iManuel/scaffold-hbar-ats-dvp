"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseEventLogs } from "viem";
import { useDvPSettlement, DvPSettlementAbi } from "~/hooks/useDvPSettlement";
import { useOraclePrice } from "~/hooks/useOraclePrice";
import { Button } from "~/components/ui/Button";
import { shortenAddress, hashScanTxUrl, formatTokenAmount } from "~/lib/formatters";
import { getDvPAddress } from "~/lib/contracts";

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

type Step = "idle" | "submitting" | "confirming" | "parsing" | "navigating" | "error";

const inputCls =
  "h-11 w-full rounded-sm bg-raised px-3 font-mono text-sm text-fg hairline " +
  "placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 " +
  "disabled:opacity-40 transition-shadow";

const labelCls = "block text-xs font-medium text-muted mb-1.5";

/**
 * CreateOfferForm — seller-facing.
 *
 * After the tx confirms on-chain:
 *   1. useWaitForTransactionReceipt returns the receipt.
 *   2. viem parseEventLogs decodes the OfferCreated event (offerId is indexed).
 *   3. router.push("/offer/{offerId}") navigates automatically.
 *
 * On any failure a HashScan link is shown for manual recovery.
 */
export function CreateOfferForm() {
  const router = useRouter();
  const { address: connectedAddress, isConnected } = useAccount();
  const { createOffer, isPending, isError: writeError, hash } = useDvPSettlement();

  const [buyer, setBuyer] = useState("");
  const [assetAmountStr, setAssetAmountStr] = useState("250");
  const [paymentAmountStr, setPaymentAmountStr] = useState("125000");
  const [expiryHoursStr, setExpiryHoursStr] = useState("72");
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  const feedId = process.env.NEXT_PUBLIC_PYTH_FEED_ID ??
    "0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd";
  // Parse assetAmount for oracle (0n if empty/invalid)
  let assetBigInt = 0n;
  try { assetBigInt = assetAmountStr ? BigInt(assetAmountStr.split(".")[0]) * 10n**18n : 0n; } catch {}
  const oracle = useOraclePrice(feedId, assetBigInt);

  const {
    data: receipt,
    isLoading: receiptLoading,
    isSuccess: receiptSuccess,
    isError: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  // Parse OfferCreated event once receipt arrives
  useEffect(() => {
    if (!receiptSuccess || !receipt) return;
    setStep("parsing");
    try {
      const logs = parseEventLogs({
        abi: DvPSettlementAbi,
        eventName: "OfferCreated",
        logs: receipt.logs,
        strict: false,
      });
      const dvpAddress = getDvPAddress().toLowerCase();
      const ourLog = logs.find((l) => l.address.toLowerCase() === dvpAddress);
      if (!ourLog) {
        setErrorMsg(
          "Transaction confirmed but no OfferCreated event found from the DvP contract. " +
          "Check HashScan to retrieve the offer ID."
        );
        setStep("error");
        return;
      }
      const offerId = ourLog.args.offerId;
      if (typeof offerId !== "bigint" || offerId <= 0n) {
        setErrorMsg("OfferCreated event found but offerId is invalid. Check HashScan.");
        setStep("error");
        return;
      }
      setStep("navigating");
      router.push("/offer/" + offerId.toString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Could not parse OfferCreated event: " + msg);
      setStep("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptSuccess, receipt]);

  useEffect(() => {
    if (receiptError && step === "confirming") {
      setErrorMsg("Transaction failed on-chain. See HashScan for details.");
      setStep("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptError]);

  useEffect(() => {
    if (hash && receiptLoading) setStep("confirming");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, receiptLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(undefined);
    setStep("idle");

    if (!isConnected) {
      setErrorMsg("Connect your wallet first");
      setStep("error");
      return;
    }
    const buyerTrimmed = buyer.trim();
    if (!buyerTrimmed.startsWith("0x") || buyerTrimmed.length !== 42) {
      setErrorMsg("Buyer must be a valid 0x address (42 characters)");
      setStep("error");
      return;
    }
    if (connectedAddress && buyerTrimmed.toLowerCase() === connectedAddress.toLowerCase()) {
      setErrorMsg("Buyer and seller cannot be the same address");
      setStep("error");
      return;
    }
    const assetAmount = parseBigIntUnits(assetAmountStr, ATS_DECIMALS);
    const paymentAmount = parseBigIntUnits(paymentAmountStr, PAYMENT_DECIMALS);
    if (assetAmount === 0n) { setErrorMsg("Asset amount must be greater than zero"); setStep("error"); return; }
    if (paymentAmount === 0n) { setErrorMsg("Payment amount must be greater than zero"); setStep("error"); return; }
    const expiryHours = parseFloat(expiryHoursStr);
    if (!isFinite(expiryHours) || expiryHours <= 0) {
      setErrorMsg("Expiry hours must be a positive number");
      setStep("error");
      return;
    }
    const expiryTimestamp = BigInt(
      Math.floor(Date.now() / 1000) + Math.floor(expiryHours * 3600)
    );
    setStep("submitting");
    try {
      await createOffer(buyerTrimmed, assetAmount, paymentAmount, expiryTimestamp);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      setStep("error");
    }
  }

  const isBusy =
    step === "submitting" || step === "confirming" ||
    step === "parsing"    || step === "navigating" || isPending;

  const stepLabel: Record<Step, string> = {
    idle:       "Create offer",
    submitting: "Creating offer...",
    confirming: "Waiting for Hedera confirmation...",
    parsing:    "Offer created. Opening offer...",
    navigating: "Opening offer...",
    error:      "Create offer",
  };

  const fields = [
    { id: "asset",  label: "Asset amount (ATS tokens)", placeholder: "250",  value: assetAmountStr,  setter: setAssetAmountStr },
    { id: "expiry", label: "Expiry (hours from now)",   placeholder: "72",   value: expiryHoursStr,  setter: setExpiryHoursStr },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isConnected && connectedAddress && (
        <p className="text-[11px] text-subtle">
          Posting as{" "}
          <span className="font-mono text-muted">{shortenAddress(connectedAddress)}</span>
        </p>
      )}

      <div>
        <label htmlFor="buyer" className={labelCls}>Buyer address</label>
        <input
          id="buyer" type="text" inputMode="text" placeholder="0x..."
          value={buyer} onChange={(e) => setBuyer(e.target.value)}
          className={inputCls} disabled={isBusy} autoComplete="off" spellCheck={false}
        />
      </div>

      {fields.map(({ id, label, placeholder, value, setter }) => (
        <div key={id}>
          <label htmlFor={id} className={labelCls}>{label}</label>
          <input
            id={id} type="text" inputMode="decimal" placeholder={placeholder}
            value={value} onChange={(e) => setter(e.target.value)}
            className={inputCls} disabled={isBusy}
          />
        </div>
      ))}

      <div>
        <label htmlFor="payment" className={labelCls}>Payment amount (USDC)</label>
        <input
          id="payment" type="text" inputMode="decimal" placeholder="125000"
          value={paymentAmountStr} onChange={(e) => setPaymentAmountStr(e.target.value)}
          className={inputCls} disabled={isBusy}
        />
        {/* Pyth oracle price suggestion — advisory only */}
        <div className="mt-1 text-xs">
          {oracle.isLoading && (
            <span className="text-gray-400">Fetching oracle price…</span>
          )}
          {!oracle.isLoading && oracle.isError && (
            <span className="text-red-400">{oracle.errorMessage}</span>
          )}
          {!oracle.isLoading && !oracle.isError && oracle.suggestedAmount !== null && (
            <span className="text-gray-500">
              Suggested payment: {formatTokenAmount(oracle.suggestedAmount, 6)} based on Pyth oracle
            </span>
          )}
        </div>
      </div>

      {step !== "idle" && step !== "error" && (
        <div className="rounded-md bg-raised px-3 py-3 hairline">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-warn animate-pulse shrink-0" />
            <span className="text-sm text-muted">{stepLabel[step]}</span>
          </div>
          {hash && (
            <a href={hashScanTxUrl(hash)} target="_blank" rel="noopener noreferrer"
              className="mt-1.5 block font-mono text-[11px] text-muted underline underline-offset-2 hover:text-fg transition-colors break-all">
              {hash.slice(0, 10)}...{hash.slice(-8)} (HashScan)
            </a>
          )}
        </div>
      )}

      {(step === "error" || (writeError && !hash)) && (
        <div className="rounded-md bg-danger/10 px-3 py-3 hairline">
          <p className="text-sm text-danger font-medium">
            {step === "error" && errorMsg ? errorMsg : "Transaction rejected or failed"}
          </p>
          {hash && (
            <a href={hashScanTxUrl(hash)} target="_blank" rel="noopener noreferrer"
              className="mt-2 block font-mono text-[11px] text-muted underline underline-offset-2 hover:text-fg transition-colors break-all">
              {hash.slice(0, 10)}...{hash.slice(-8)} (HashScan)
            </a>
          )}
          {!errorMsg && (
            <p className="mt-1 text-[11px] text-subtle">Check your wallet for more details.</p>
          )}
        </div>
      )}

      <Button type="submit" disabled={isBusy || !isConnected} className="w-full">
        {isBusy ? stepLabel[step] : "Create offer"}
      </Button>
    </form>
  );
}

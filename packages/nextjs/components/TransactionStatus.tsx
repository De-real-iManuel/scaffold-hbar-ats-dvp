"use client";

import { useWaitForTransactionReceipt } from "wagmi";

const HASHSCAN_BASE = "https://hashscan.io/testnet/transaction/";

interface TransactionStatusProps {
  hash: `0x${string}` | undefined;
  isError: boolean;
  errorMessage?: string;
}

export function TransactionStatus({ hash, isError, errorMessage }: TransactionStatusProps) {
  const { status, isLoading } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  // No hash and no error: render nothing
  if (!hash && !isError) {
    return null;
  }

  const hashScanLink = hash ? (
    <a
      href={`${HASHSCAN_BASE}${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline text-sm break-all"
    >
      View on HashScan ↗
    </a>
  ) : null;

  // Error prop set (write failed before hash)
  if (isError && !hash) {
    return (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
        <p className="text-red-700 font-medium">❌ Transaction failed</p>
        {errorMessage && <p className="text-red-600 mt-1">{errorMessage}</p>}
      </div>
    );
  }

  // Hash present — show status
  if (hash) {
    if (isLoading || status === "pending") {
      return (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-700 font-medium">
            Transaction submitted — waiting for confirmation...
          </p>
          <div className="mt-1">{hashScanLink}</div>
        </div>
      );
    }

    if (status === "success") {
      return (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
          <p className="text-green-700 font-semibold">✅ Settlement confirmed!</p>
          <div className="mt-1">{hashScanLink}</div>
        </div>
      );
    }

    if (status === "error" || isError) {
      return (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
          <p className="text-red-700 font-medium">❌ Transaction failed</p>
          {errorMessage && <p className="text-red-600 mt-1">{errorMessage}</p>}
          <div className="mt-1">{hashScanLink}</div>
        </div>
      );
    }

    // Unknown/loading status with hash
    return (
      <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
        <p className="text-gray-700 font-medium">⏳ Checking transaction status...</p>
        <div className="mt-1">{hashScanLink}</div>
      </div>
    );
  }

  return null;
}

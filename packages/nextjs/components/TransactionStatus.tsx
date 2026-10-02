"use client";

import { useWaitForTransactionReceipt } from "wagmi";
import { hashScanTxUrl } from "~/lib/formatters";

interface TransactionStatusProps {
  hash: `0x${string}` | undefined;
  isError: boolean;
  errorMessage?: string;
  /** Optional label shown in the success state */
  successLabel?: string;
}

/**
 * Tracks a submitted transaction and renders a status pill.
 * Matches the dark Grok design — no bright colors, desaturated success/error tones.
 */
export function TransactionStatus({
  hash,
  isError,
  errorMessage,
  successLabel = "Transaction confirmed",
}: TransactionStatusProps) {
  const { status, isLoading } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  if (!hash && !isError) return null;

  const hashScanLink = hash ? (
    <a
      href={hashScanTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-[11px] text-muted underline underline-offset-2 hover:text-fg transition-colors break-all"
    >
      {hash.slice(0, 10)}…{hash.slice(-8)} ↗
    </a>
  ) : null;

  /* Error before hash */
  if (isError && !hash) {
    return (
      <div className="mt-3 rounded-md bg-danger/10 px-3 py-3 hairline text-sm">
        <p className="text-danger font-medium">Transaction failed</p>
        {errorMessage && (
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] text-subtle">
              Details
            </summary>
            <p className="mt-1 font-mono text-[11px] text-muted break-all">
              {errorMessage}
            </p>
          </details>
        )}
      </div>
    );
  }

  if (hash) {
    if (isLoading || status === "pending") {
      return (
        <div className="mt-3 rounded-md bg-raised px-3 py-3 hairline text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-warn animate-pulse" />
            <span className="text-muted">Waiting for confirmation…</span>
          </div>
          <div className="mt-1.5">{hashScanLink}</div>
        </div>
      );
    }

    if (status === "success") {
      return (
        <div className="mt-3 rounded-md bg-success/10 px-3 py-3 hairline text-sm">
          <p className="text-success font-medium">{successLabel}</p>
          <div className="mt-1.5">{hashScanLink}</div>
        </div>
      );
    }

    if (status === "error" || isError) {
      return (
        <div className="mt-3 rounded-md bg-danger/10 px-3 py-3 hairline text-sm">
          <p className="text-danger font-medium">Transaction failed</p>
          {errorMessage && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[11px] text-subtle">
                Details
              </summary>
              <p className="mt-1 font-mono text-[11px] text-muted break-all">
                {errorMessage}
              </p>
            </details>
          )}
          <div className="mt-1.5">{hashScanLink}</div>
        </div>
      );
    }

    /* hash present but status not yet known */
    return (
      <div className="mt-3 rounded-md bg-raised px-3 py-3 hairline text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-muted animate-pulse" />
          <span className="text-subtle">Checking transaction…</span>
        </div>
        <div className="mt-1.5">{hashScanLink}</div>
      </div>
    );
  }

  return null;
}

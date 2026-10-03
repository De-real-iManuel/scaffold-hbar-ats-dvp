"use client";

import { useState } from "react";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useDvPSettlement, DvPSettlementAbi } from "~/hooks/useDvPSettlement";
import { useOfferPreflights } from "~/hooks/useOfferPreflights";
import { TransactionStatus } from "~/components/TransactionStatus";
import { Panel } from "~/components/ui/Panel";
import { Button } from "~/components/ui/Button";
import { StatusChip } from "~/components/ui/StatusChip";
import {
  formatTokenAmount,
  formatExpiry,
  isExpired,
  shortenAddress,
} from "~/lib/formatters";
import { getDvPAddress, getPaymentTokenAddress } from "~/lib/contracts";

const ATS_DECIMALS = 18;
const PAYMENT_DECIMALS = 6;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const erc20ApproveAbi = [
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

// ─── CheckBit row ────────────────────────────────────────────────────────────

function CheckBit({
  label,
  ready,
}: {
  label: string;
  ready: boolean | null;
}) {
  const valueText =
    ready === null ? "Unknown" : ready ? "Ready" : "Not ready";
  const valueClass =
    ready === null
      ? "text-subtle"
      : ready
      ? "text-success"
      : "text-warn";

  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{valueText}</span>
    </div>
  );
}

// ─── CEI / Atomic visualisation ──────────────────────────────────────────────

type BeatState = "pass" | "fail" | "rollback" | "pending";

interface Beat {
  label: string;
  detail: string;
  state: BeatState;
}

function beatClasses(state: BeatState): { bg: string; label: string; text: string } {
  switch (state) {
    case "pass":
      return {
        bg: "bg-success/10",
        label: "text-success",
        text: "Committed",
      };
    case "fail":
      return { bg: "bg-danger/12", label: "text-danger", text: "Reverted" };
    case "rollback":
      return {
        bg: "bg-warn/10",
        label: "text-warn",
        text: "Rolled back",
      };
    default:
      return { bg: "bg-raised", label: "text-subtle", text: "Pending" };
  }
}

function AtomicViz({
  settledHash,
  failed,
}: {
  settledHash?: string;
  failed?: boolean;
}) {
  const beats: Beat[] = [
    {
      label: "CHECKS",
      detail: "caller is buyer · offer Open · not expired",
      state: settledHash ? "pass" : failed ? "fail" : "pending",
    },
    {
      label: "EFFECTS",
      detail: "status written to Filled before any transfer",
      state: settledHash ? "pass" : failed ? "fail" : "pending",
    },
    {
      label: "HTS payment",
      detail: "transferFrom buyer → seller via payment token",
      state: settledHash ? "pass" : failed ? "rollback" : "pending",
    },
    {
      label: "ATS asset",
      detail: "transferFrom seller → buyer · KYC enforced by ATS token",
      state: settledHash ? "pass" : failed ? "rollback" : "pending",
    },
    {
      label: "Confirmation",
      detail: settledHash
        ? `OfferSettled event emitted · tx ${settledHash.slice(0, 10)}…`
        : "OfferSettled event emitted on-chain",
      state: settledHash ? "pass" : failed ? "fail" : "pending",
    },
  ];

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-2">
        CEI execution trace
      </p>
      {beats.map((beat) => {
        const { bg, label, text } = beatClasses(beat.state);
        return (
          <div
            key={beat.label}
            className={`rounded-md px-3 py-3 transition-colors ${bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-fg">{beat.label}</span>
              <span className={`text-[11px] font-medium ${label}`}>{text}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-subtle">{beat.detail}</p>
          </div>
        );
      })}
      {failed && (
        <p className="mt-1 text-sm text-danger">
          Transfer condition not met. Neither leg moved — full revert.
        </p>
      )}
    </div>
  );
}

// ─── Offer detail row ────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-line py-2.5 last:border-0 gap-4">
      <span className="text-sm text-muted shrink-0">{label}</span>
      <span className="text-sm text-fg text-right">{children}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OfferViewProps {
  offerId: bigint;
}

export function OfferView({ offerId }: OfferViewProps) {
  const { address: currentUser } = useAccount();
  const [actionError, setActionError] = useState<string | undefined>();

  // ── Read offer from chain ──
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

  // ── Write hooks (preserved unchanged) ──
  const {
    acceptOffer,
    cancelOffer,
    isPending: dvpPending,
    isError: dvpError,
    hash: dvpHash,
  } = useDvPSettlement();

  const {
    writeContractAsync: approveAsync,
    isPending: approvePending,
    isSuccess: approveSuccess,
    isError: approveError,
    data: approveHash,
  } = useWriteContract();

  // ── Decode offer tuple ──
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

  // ── Advisory preflights (preserved) ──
  const { allowanceSufficient, balanceSufficient } = useOfferPreflights({
    buyer: buyer && buyer !== ZERO_ADDRESS ? buyer : undefined,
    paymentAmount: paymentAmount ?? 0n,
    offerId,
  });

  // ── Derived booleans ──
  const expired = expiry !== undefined ? isExpired(expiry) : false;
  const isOfferOpen = status === 0;
  const isBuyer =
    !!currentUser &&
    !!buyer &&
    currentUser.toLowerCase() === buyer.toLowerCase();
  const isSeller =
    !!currentUser &&
    !!seller &&
    currentUser.toLowerCase() === seller.toLowerCase();
  const notFound =
    !offerLoading &&
    offer !== undefined &&
    (id === 0n || seller === ZERO_ADDRESS);

  // ── Tx handlers ──
  async function handleApprove() {
    if (!paymentAmount) return;
    setActionError(undefined);
    try {
      await approveAsync({
        address: getPaymentTokenAddress(),
        abi: erc20ApproveAbi,
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
      await refetchOffer();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCancel() {
    setActionError(undefined);
    try {
      await cancelOffer(offerId);
      await refetchOffer();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Loading / not found states ──
  if (offerLoading) {
    return (
      <Panel>
        <div className="flex items-center gap-2 py-4">
          <span className="inline-block size-2 rounded-full bg-muted animate-pulse" />
          <p className="text-sm text-muted">
            Loading offer #{offerId.toString()}…
          </p>
        </div>
      </Panel>
    );
  }

  if (notFound || offer === undefined) {
    return (
      <Panel>
        <p className="text-sm text-muted py-4">
          Offer not found (ID:{" "}
          <span className="font-mono">{offerId.toString()}</span>)
        </p>
      </Panel>
    );
  }

  const statusNum = status ?? 0;
  const settledHash = status === 1 ? dvpHash : undefined;
  const settleFailed = dvpError;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      {/* ── Left column: offer details + actions ── */}
      <div className="space-y-4">
        <Panel>
          {/* Actor hint */}
          {currentUser && (
            <p className="mb-4 text-[11px] text-subtle">
              Signed in as{" "}
              <span className="font-mono text-muted">
                {shortenAddress(currentUser)}
              </span>
              {isBuyer && " · Buyer"}
              {isSeller && " · Seller"}
            </p>
          )}

          {/* Offer metadata */}
          <dl className="divide-y divide-line">
            <DetailRow label="Status">
              <StatusChip status={statusNum} expired={expired} />
            </DetailRow>
            <DetailRow label="Seller">
              <span className="font-mono text-xs">
                {seller ? shortenAddress(seller) : "—"}
                {isSeller && (
                  <span className="ml-2 text-accent text-[11px]">(you)</span>
                )}
              </span>
            </DetailRow>
            <DetailRow label="Buyer">
              <span className="font-mono text-xs">
                {buyer ? shortenAddress(buyer) : "—"}
                {isBuyer && (
                  <span className="ml-2 text-accent text-[11px]">(you)</span>
                )}
              </span>
            </DetailRow>
            <DetailRow label="Asset (ATS)">
              <span className="font-mono tabular">
                {assetAmount !== undefined
                  ? formatTokenAmount(assetAmount, ATS_DECIMALS)
                  : "—"}
              </span>
            </DetailRow>
            <DetailRow label="Payment (USDC)">
              <span className="font-mono tabular">
                {paymentAmount !== undefined
                  ? formatTokenAmount(paymentAmount, PAYMENT_DECIMALS)
                  : "—"}
              </span>
            </DetailRow>
            <DetailRow label="Expiry">
              {expiry !== undefined ? (
                <span className={expired ? "text-danger" : "text-fg"}>
                  {formatExpiry(expiry)}
                  {expired && " · Expired"}
                </span>
              ) : (
                "—"
              )}
            </DetailRow>
            {dvpHash && (
              <DetailRow label="Settlement tx">
                <a
                  href={`https://hashscan.io/testnet/transaction/${dvpHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-muted hover:text-fg underline underline-offset-2 transition-colors"
                >
                  {dvpHash.slice(0, 10)}…{dvpHash.slice(-6)} ↗
                </a>
              </DetailRow>
            )}
          </dl>
        </Panel>

        {/* ── Action buttons (contextual by role) ── */}
        {isOfferOpen && !expired && (
          <Panel>
            <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-3">
              Actions
            </p>

            {isBuyer && (
              <div className="space-y-2">
                {/* Step 1: approve payment token */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted">
                    Step 1 — Approve payment token
                  </p>
                  <Button
                    variant="secondary"
                    onClick={handleApprove}
                    disabled={approvePending || dvpPending}
                    className="w-full"
                  >
                    {approvePending
                      ? "Approving…"
                      : `Approve ${
                          paymentAmount !== undefined
                            ? formatTokenAmount(paymentAmount, PAYMENT_DECIMALS)
                            : ""
                        } USDC`}
                  </Button>
                  <TransactionStatus
                    hash={approveHash as `0x${string}` | undefined}
                    isError={approveError && !approveHash}
                    successLabel="Approval confirmed"
                  />
                </div>

                {/* Step 2: accept offer */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted">
                    Step 2 — Accept and settle atomically
                  </p>
                  <Button
                    onClick={handleAccept}
                    disabled={dvpPending || approvePending}
                    className="w-full"
                  >
                    {dvpPending ? "Settling…" : "Accept offer"}
                  </Button>
                </div>
              </div>
            )}

            {isSeller && (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  You created this offer. You may cancel it at any time while
                  it remains open.
                </p>
                <Button
                  variant="danger"
                  onClick={handleCancel}
                  disabled={dvpPending}
                  className="w-full"
                >
                  {dvpPending ? "Cancelling…" : "Cancel offer"}
                </Button>
              </div>
            )}

            {!isBuyer && !isSeller && (
              <div className="space-y-2">
                <p className="text-sm text-muted">
                  Your wallet is not the buyer or seller on this offer.
                </p>
                <div className="rounded-md bg-raised p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-subtle font-medium">Seller</span>
                    <span className="font-mono text-muted">{seller ? shortenAddress(seller) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-subtle font-medium">Buyer</span>
                    <span className="font-mono text-muted">{buyer ? shortenAddress(buyer) : "—"}</span>
                  </div>
                </div>
                <p className="text-xs text-subtle">
                  Switch to one of these wallets to approve, accept, or cancel.
                </p>
              </div>
            )}

            {actionError && (
              <p className="mt-2 text-sm text-danger">{actionError}</p>
            )}

            <TransactionStatus
              hash={dvpHash}
              isError={dvpError && !dvpHash}
              errorMessage={dvpError ? actionError : undefined}
              successLabel="DvP settlement confirmed"
            />
          </Panel>
        )}

        {status === 2 && (
          <Panel>
            <p className="text-sm text-muted">
              This offer was cancelled and is no longer active.
            </p>
          </Panel>
        )}

        {status === 1 && (
          <Panel>
            <p className="text-sm text-success font-medium">
              DvP settlement completed.
            </p>
            <p className="mt-1 text-xs text-muted">
              Both asset and payment legs transferred atomically. The offer is
              now settled.
            </p>
          </Panel>
        )}
      </div>

      {/* ── Right column: advisory checks + CEI trace ── */}
      <div className="space-y-4">
        {/* Advisory checks */}
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-1">
            Advisory checks
          </p>
          <p className="text-xs text-muted mb-3 leading-relaxed">
            Pre-flight conditions for atomic settlement. These are advisory —
            the contract enforces them on-chain.
          </p>
          <div className="divide-y divide-line">
            <CheckBit
              label="Buyer payment balance"
              ready={balanceSufficient}
            />
            <CheckBit
              label="Buyer payment allowance"
              ready={allowanceSufficient}
            />
            <CheckBit
              label="Buyer ATS eligibility"
              ready={null}
            />
            <CheckBit
              label="ATS not paused"
              ready={null}
            />
          </div>
          <p className="mt-2 text-[11px] text-subtle">
            ATS eligibility and pause state require an on-chain ATS contract
            read — check via{" "}
            <a
              href="https://hashscan.io/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-muted transition-colors"
            >
              HashScan ↗
            </a>
          </p>
        </Panel>

        {/* CEI trace visualisation */}
        <Panel>
          <AtomicViz
            settledHash={settledHash}
            failed={settleFailed}
          />
          {!dvpHash && !dvpError && (
            <p className="mt-3 text-xs text-subtle leading-relaxed">
              The CEI trace will animate once the buyer accepts the offer.
              All five steps must pass — if any transfer fails, the EVM
              reverts both legs.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Panel } from "~/components/ui/Panel";
import { Button } from "~/components/ui/Button";
import { TokenBalances } from "~/components/TokenBalances";

/**
 * Client-side dashboard widget.
 *
 * 1. Shows an "Offer lookup" panel — navigate to any offer by ID.
 * 2. Shows wallet connection status in an introductory card.
 *
 * All blockchain reads are delegated to TokenBalances (which uses hooks).
 */
export function DashboardClient() {
  const { isConnected } = useAccount();
  const [offerId, setOfferId] = useState("");

  return (
    <Panel padded={false}>
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <p className="text-sm font-medium text-fg">Offer lookup</p>
        <p className="text-[11px] text-subtle">Navigate to any offer by ID</p>
      </div>

      {/* Wallet state */}
      {!isConnected ? (
        <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted">
            Connect your wallet to create offers, view your positions, and
            execute DvP settlements on Hedera Testnet.
          </p>
          <ConnectButton />
        </div>
      ) : (
        <div className="px-5 py-5">
          <p className="text-sm text-muted mb-4">
            Wallet connected. Enter an offer ID to view its status and act as
            buyer or seller.
          </p>

          {/* Offer ID form */}
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={offerId}
              onChange={(e) => setOfferId(e.target.value.replace(/\D/g, ""))}
              placeholder="Offer ID…"
              className="h-11 flex-1 rounded-sm bg-raised px-3 font-mono text-sm text-fg hairline placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
            />
            <Link
              href={offerId ? `/offer/${offerId}` : "#"}
              tabIndex={offerId ? 0 : -1}
              aria-disabled={!offerId}
              className={[
                "inline-flex h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors",
                offerId
                  ? "bg-accent text-accent-fg hover:bg-fg"
                  : "bg-raised text-subtle hairline cursor-not-allowed",
              ].join(" ")}
            >
              Go →
            </Link>
          </div>

          <p className="mt-2 text-[11px] text-subtle">
            After creating an offer, find the ID in the{" "}
            <a
              href="https://hashscan.io/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-muted transition-colors"
            >
              OfferCreated event on HashScan ↗
            </a>
          </p>
        </div>
      )}
    </Panel>
  );
}

/**
 * Separate export used by the homepage right-column "Positions" panel.
 * Renders the TokenBalances component (which needs wallet context).
 */
export function DashboardPositions() {
  return <TokenBalances />;
}

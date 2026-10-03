"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Panel } from "~/components/ui/Panel";
import { TokenBalances } from "~/components/TokenBalances";

export function DashboardClient() {
  const { isConnected } = useAccount();
  const [offerId, setOfferId] = useState("");

  return (
    <Panel padded={false}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <p className="text-sm font-medium text-fg">Offer lookup</p>
        <p className="text-[11px] text-subtle">Enter an offer ID to view or settle</p>
      </div>

      {!isConnected ? (
        <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted">
            Connect your wallet to create offers, look up offer IDs, and
            execute DvP settlements on Hedera Testnet.
          </p>
          <ConnectButton />
        </div>
      ) : (
        <div className="px-5 py-5 space-y-5">
          {/* Offer ID lookup */}
          <div>
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
              Offer IDs appear in the{" "}
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

          {/* Role guidance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-raised p-3 space-y-2">
              <p className="text-xs font-medium text-fg">Seller flow</p>
              <ol className="space-y-1.5 text-[11px] text-subtle">
                <li>① Approve ATS token allowance</li>
                <li>② Create offer — set buyer, amounts, expiry</li>
                <li>③ Share the offer ID with buyer</li>
              </ol>
              <Link
                href="/create"
                className="mt-1 block text-[11px] text-accent hover:underline"
              >
                Create offer →
              </Link>
            </div>
            <div className="rounded-md bg-raised p-3 space-y-2">
              <p className="text-xs font-medium text-fg">Buyer flow</p>
              <ol className="space-y-1.5 text-[11px] text-subtle">
                <li>① Get offer ID from seller</li>
                <li>② Enter ID above and open</li>
                <li>③ Approve payment → Accept offer</li>
              </ol>
              <p className="mt-1 text-[11px] text-subtle">
                Both legs settle atomically ↑
              </p>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function DashboardPositions() {
  return <TokenBalances />;
}
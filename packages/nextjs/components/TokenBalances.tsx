"use client";

import { useAccount } from "wagmi";
import { useTokenBalances } from "~/hooks/useTokenBalances";
import { formatTokenAmount, shortenAddress } from "~/lib/formatters";
import { getAtsTokenAddress, getPaymentTokenAddress } from "~/lib/contracts";

const ATS_DECIMALS = 18;
const PAYMENT_DECIMALS = 6;

/**
 * Wallet positions panel — shows ATS + payment token balances.
 * Styled to match the Grok "Positions" panel (dark raised cards per actor).
 */
export function TokenBalances() {
  const { address, isConnected } = useAccount();
  const { atsBalance, paymentBalance, isLoading } = useTokenBalances(address);

  const atsAddress = getAtsTokenAddress();
  const paymentAddress = getPaymentTokenAddress();

  const displayAts = !isConnected
    ? "—"
    : isLoading
    ? "…"
    : formatTokenAmount(atsBalance, ATS_DECIMALS);

  const displayPayment = !isConnected
    ? "—"
    : isLoading
    ? "…"
    : formatTokenAmount(paymentBalance, PAYMENT_DECIMALS);

  return (
    <div className="space-y-3">
      {/* ATS token row */}
      <div className="rounded-md bg-raised p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted">ATS Token</p>
            <p className="font-mono text-[11px] text-subtle">
              {shortenAddress(atsAddress)}
            </p>
          </div>
          <span className="font-mono text-sm tabular text-fg">{displayAts}</span>
        </div>
        <p className="text-[11px] text-subtle">ATS · ERC-1400 / permissioned</p>
      </div>

      {/* Payment token row */}
      <div className="rounded-md bg-raised p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted">Payment Token</p>
            <p className="font-mono text-[11px] text-subtle">
              {shortenAddress(paymentAddress)}
            </p>
          </div>
          <span className="font-mono text-sm tabular text-fg">{displayPayment}</span>
        </div>
        <p className="text-[11px] text-subtle">USDC · HTS fungible token</p>
      </div>

      {!isConnected && (
        <p className="text-[11px] text-subtle text-center py-1">
          Connect wallet to view balances
        </p>
      )}

      {isConnected && address && (
        <p className="text-[11px] text-subtle">
          {shortenAddress(address)}
        </p>
      )}
    </div>
  );
}

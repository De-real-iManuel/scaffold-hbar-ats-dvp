"use client";

import { useQuery } from "@tanstack/react-query";
import { computeSuggestedAmount, isStale } from "./oracleUtils";

export interface OraclePriceResult {
  suggestedAmount: bigint | null;
  price: number | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
}

const DEFAULT_FEED_ID =
  process.env.NEXT_PUBLIC_PYTH_FEED_ID ??
  "0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd";

async function fetchPythPrice(
  feedId: string
): Promise<{ rawPrice: string; expo: number; publishTime: number }> {
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&parsed=true`;
  const headers: Record<string, string> = {};
  const apiKey = process.env.NEXT_PUBLIC_PYTH_API_KEY;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Oracle price unavailable: ${res.status}`);
    }
    const data = await res.json();
    const parsed = data?.parsed;
    if (!parsed || parsed.length === 0) {
      throw new Error("No price data returned for feed");
    }
    const entry = parsed[0];
    return {
      rawPrice: entry.price.price as string,
      expo: entry.price.expo as number,
      publishTime: entry.price.publish_time as number,
    };
  } catch (err: unknown) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Oracle request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches the latest Pyth price for the given feed ID and computes
 * an advisory suggested payment amount for the given asset amount.
 *
 * The suggestion is purely advisory — the DvPSettlement contract enforces
 * no pricing. The form remains fully submittable regardless of oracle state.
 */
export function useOraclePrice(
  feedId: string = DEFAULT_FEED_ID,
  assetAmount: bigint = 0n
): OraclePriceResult {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pythOraclePrice", feedId],
    queryFn: () => fetchPythPrice(feedId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return { suggestedAmount: null, price: null, isLoading: true, isError: false, errorMessage: null };
  }

  if (isError || !data) {
    const msg = error instanceof Error ? error.message : "Oracle price unavailable";
    return { suggestedAmount: null, price: null, isLoading: false, isError: true, errorMessage: msg };
  }

  const nowSeconds = Date.now() / 1000;
  if (isStale(data.publishTime, nowSeconds)) {
    const delta = Math.round(nowSeconds - data.publishTime);
    return {
      suggestedAmount: null,
      price: null,
      isLoading: false,
      isError: true,
      errorMessage: `Oracle price is stale (last update: ${delta} seconds ago)`,
    };
  }

  const suggested = computeSuggestedAmount(data.rawPrice, data.expo, assetAmount);
  // price as a human-readable number for display (not used for calculations)
  const expoAbs = Math.abs(data.expo);
  const priceDisplay = Number(data.rawPrice) / Math.pow(10, expoAbs);

  return {
    suggestedAmount: suggested,
    price: priceDisplay,
    isLoading: false,
    isError: false,
    errorMessage: null,
  };
}

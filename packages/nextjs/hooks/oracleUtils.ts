/**
 * Compute a suggested payment amount (6-decimal units) from a Pyth price feed result.
 *
 * Formula: (rawPrice * assetAmount * 10^6) / (10^expoAbs * 10^18)
 *
 * Uses ONLY bigint arithmetic - no parseFloat, toFixed, or Number() on token amounts.
 *
 * @param rawPriceStr  - Pyth price.price field (decimal string, may be negative - abs taken)
 * @param expo         - Pyth price.expo field (negative integer, e.g. -8)
 * @param assetAmount  - Asset token amount in 18-decimal base units (bigint)
 * @returns suggestedAmount in 6-decimal payment token units (bigint)
 */
export function computeSuggestedAmount(
  rawPriceStr: string,
  expo: number,
  assetAmount: bigint
): bigint {
  const raw = BigInt(rawPriceStr);
  const rawPrice = raw < 0n ? -raw : raw;
  const expoAbs = BigInt(Math.abs(expo));
  const numerator = rawPrice * assetAmount * 10n ** 6n;
  const denominator = 10n ** expoAbs * 10n ** 18n;
  if (denominator === 0n) return 0n;
  return numerator / denominator;
}

/**
 * Returns true when the Pyth price data is stale.
 * Stale = published more than 60 seconds before the given current time.
 *
 * @param publishTime  - Unix seconds (from Pyth price.publish_time)
 * @param currentTime  - Unix seconds (typically Date.now() / 1000)
 */
export function isStale(publishTime: number, currentTime: number): boolean {
  return currentTime - publishTime > 60;
}

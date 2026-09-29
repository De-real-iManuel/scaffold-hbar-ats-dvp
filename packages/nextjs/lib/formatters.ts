/**
 * Format a bigint token amount to a human-readable string.
 *
 * Uses ONLY integer bigint arithmetic — no parseFloat, toFixed, or Number()
 * conversions are used for any on-chain transaction inputs.
 *
 * @param amount    Token amount in base units (e.g. wei for 18-decimal tokens).
 * @param decimals  Number of decimal places for this token.
 * @returns         String like "100.000000000000000000" or "50.000000".
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) {
    return amount.toString();
  }

  const factor = 10n ** BigInt(decimals);
  const whole = amount / factor;
  const frac = amount % factor;

  // Pad fraction with leading zeros to match decimal precision
  const fracStr = frac.toString().padStart(decimals, "0");

  return `${whole}.${fracStr}`;
}

/**
 * Parse a human-readable decimal string to a bigint in base units.
 *
 * Uses only string operations and integer arithmetic.
 * Truncates (does not round) to the given number of decimal places.
 *
 * @param value     String like "100.5" or "50".
 * @param decimals  Number of decimal places for this token.
 * @returns         Amount in base units as bigint.
 */
export function parseTokenAmount(value: string, decimals: number): bigint {
  if (!value || value.trim() === "") return 0n;

  const [wholePart, fracPart = ""] = value.split(".");
  const wholeInt = BigInt(wholePart || "0");
  const factor = 10n ** BigInt(decimals);

  // Pad or truncate fraction to exactly `decimals` characters
  const fracTrunc = fracPart.slice(0, decimals).padEnd(decimals, "0");
  const fracInt = BigInt(fracTrunc);

  return wholeInt * factor + fracInt;
}

/**
 * Format a Unix timestamp (seconds) to a locale date-time string.
 */
export function formatExpiry(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

/**
 * Return true if the offer is expired given a timestamp and current time.
 * Uses on-chain expiry semantics: expired if block.timestamp >= expiry.
 */
export function isExpired(expiry: bigint, nowSeconds?: bigint): boolean {
  const now = nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  return now >= expiry;
}

/**
 * Shorten an EVM address for display: "0x1234...abcd"
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Build a HashScan transaction URL for Hedera Testnet.
 */
export function hashScanTxUrl(txHash: string, network: "testnet" | "mainnet" = "testnet"): string {
  return `https://hashscan.io/${network}/transaction/${txHash}`;
}

/**
 * Build a HashScan contract URL for Hedera Testnet.
 */
export function hashScanContractUrl(address: string, network: "testnet" | "mainnet" = "testnet"): string {
  return `https://hashscan.io/${network}/contract/${address}`;
}

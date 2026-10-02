// Hedera Testnet requires minimum 870 Gwei
export const HEDERA_GAS_PRICE = 900_000_000_000n;
export function normalizeKey(key: string): string {
  return key.startsWith('0x') ? key : `0x${key}`;
}
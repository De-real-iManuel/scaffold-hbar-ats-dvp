import type { Address } from "viem";
import deployedContracts from "~/contracts/deployedContracts";

/**
 * True when no testnet environment variables are set.
 * In local mode, addresses fall back to Hardhat local deployments.
 * The UI displays a "Local Mode" warning banner.
 */
export const isLocalMode = !process.env.NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS;

/**
 * EVM address of the deployed DvPSettlement contract.
 * Falls back to the local Hardhat deployment artifact when in local mode.
 */
export function getDvPAddress(): Address {
  if (!isLocalMode) {
    return process.env.NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS as Address;
  }
  const localDeployments = deployedContracts as Record<
    string,
    Record<string, { address: string; abi: unknown[] }>
  >;
  const hardhatDvP =
    localDeployments["hardhat"]?.["DvPSettlement"]?.address ??
    localDeployments["localhost"]?.["DvPSettlement"]?.address;
  if (!hardhatDvP) {
    // Return zero address in local mode if no deployment exists yet
    return "0x0000000000000000000000000000000000000000";
  }
  return hardhatDvP as Address;
}

/**
 * EVM address of the ATS asset token.
 */
export function getAtsTokenAddress(): Address {
  if (!isLocalMode) {
    return process.env.NEXT_PUBLIC_ATS_TOKEN_ADDRESS as Address;
  }
  const localDeployments = deployedContracts as Record<
    string,
    Record<string, { address: string; abi: unknown[] }>
  >;
  const hardhatAts =
    localDeployments["hardhat"]?.["MockATSToken"]?.address ??
    localDeployments["localhost"]?.["MockATSToken"]?.address;
  if (!hardhatAts) {
    return "0x0000000000000000000000000000000000000000";
  }
  return hardhatAts as Address;
}

/**
 * EVM address of the HTS payment token.
 */
export function getPaymentTokenAddress(): Address {
  if (!isLocalMode) {
    return process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS as Address;
  }
  const localDeployments = deployedContracts as Record<
    string,
    Record<string, { address: string; abi: unknown[] }>
  >;
  const hardhatPay =
    localDeployments["hardhat"]?.["MockERC20"]?.address ??
    localDeployments["localhost"]?.["MockERC20"]?.address;
  if (!hardhatPay) {
    return "0x0000000000000000000000000000000000000000";
  }
  return hardhatPay as Address;
}

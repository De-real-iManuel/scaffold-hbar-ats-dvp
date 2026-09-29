import * as dotenv from "dotenv";
import * as path from "path";
import { ethers } from "ethers";
import { writeStep, readState } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const HEDERA_TESTNET_CHAIN_ID = 296n;
const MIN_HBAR_BALANCE_TINYBAR = 10n * 100_000_000n; // 10 HBAR in tinybars
const ADDR_REGEX = /^0x[0-9a-fA-F]{40}$/;

const REQUIRED_VARS = [
  "DEPLOYER_PRIVATE_KEY",
  "ATS_ADMIN_PRIVATE_KEY",
  "SELLER_PRIVATE_KEY",
  "BUYER_PRIVATE_KEY",
];

async function main() {
  console.log("=== Step 1: Validate Network and Prerequisites ===\n");

  // Check required env vars
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   ${v}`));
    console.error(
      "\nSet them in packages/hardhat/.env — NEVER commit that file."
    );
    process.exit(1);
  }

  // Validate optional address vars if present
  for (const varName of ["ATS_TOKEN_ADDRESS", "PAYMENT_TOKEN_ADDRESS"]) {
    const val = process.env[varName];
    if (val && !ADDR_REGEX.test(val)) {
      console.error(
        `❌ ${varName} is set but is not a valid EVM address: ${val}`
      );
      process.exit(1);
    }
  }

  // Connect to Hedera Testnet
  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  console.log(`Connecting to: ${rpcUrl}`);

  let provider: ethers.JsonRpcProvider;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
  } catch (err) {
    console.error(`❌ Failed to create provider: ${(err as Error).message}`);
    process.exit(1);
  }

  // Check chain ID
  let network: { chainId: bigint };
  try {
    network = await provider.getNetwork();
  } catch (err) {
    console.error(`❌ Cannot reach network at ${rpcUrl}: ${(err as Error).message}`);
    console.error(
      "   Ensure you have internet access and the RPC endpoint is correct."
    );
    process.exit(1);
  }

  if (network.chainId !== HEDERA_TESTNET_CHAIN_ID) {
    console.error(
      `❌ Wrong network: expected chainId ${HEDERA_TESTNET_CHAIN_ID}, got ${network.chainId}`
    );
    console.error(
      "   Set HEDERA_RPC_URL=https://testnet.hashio.io/api in your .env"
    );
    process.exit(1);
  }
  console.log(`✓ Connected to Hedera Testnet (chainId ${network.chainId})`);

  // Check deployer HBAR balance
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY!;
  const deployerWallet = new ethers.Wallet(deployerKey, provider);
  const balance = await provider.getBalance(deployerWallet.address);

  console.log(
    `✓ Deployer: ${deployerWallet.address}`
  );
  console.log(
    `  Balance: ${balance} tinybars (${Number(balance) / 100_000_000} HBAR)`
  );

  if (balance < MIN_HBAR_BALANCE_TINYBAR) {
    console.error(
      `❌ Deployer balance too low: ${balance} tinybars. Need at least 10 HBAR.`
    );
    console.error(
      "   Get testnet HBAR from: https://portal.hedera.com/register"
    );
    process.exit(1);
  }
  console.log(`✓ Deployer balance sufficient`);

  writeStep("validate", { done: true });

  console.log("\n✅ Validation passed. Ready to run setup scripts 2–7.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

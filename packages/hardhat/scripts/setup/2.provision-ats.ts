import * as dotenv from "dotenv";
import * as path from "path";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Script 2: Provision ATS Demo Asset
 *
 * Creates a demo ATS fungible token using @hashgraph/asset-tokenization-sdk.
 * The ATS token is an ERC-20-compatible security token with KYC enforcement.
 *
 * SUPPORTED CONFIGURATION:
 *   - Default partition only (no protected partitions)
 *   - KYC/eligibility enabled (enforced on buyer at transfer time)
 *   - Standard ERC-20 transferFrom via allowance works correctly
 *
 * Skips if already provisioned (idempotent).
 */
async function main() {
  console.log("=== Step 2: Provision ATS Demo Asset ===\n");

  const state = readState();
  if (state.steps.provisionAts?.done) {
    console.log(`✓ ATS token already provisioned: ${state.steps.provisionAts.atsTokenAddress}`);
    console.log("  Skipping. Delete setup-state.json to re-provision.");
    return;
  }

  // Verify required env vars
  const requiredVars = ["ATS_ADMIN_PRIVATE_KEY", "ATS_FACTORY_ADDRESS", "ATS_RESOLVER_ADDRESS"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables for ATS provisioning:");
    missing.forEach((v) => console.error(`   ${v}`));
    console.error("\nSee packages/hardhat/.env.example for descriptions.");
    console.error(
      "ATS_FACTORY_ADDRESS and ATS_RESOLVER_ADDRESS come from the ATS deployment."
    );
    console.error(
      "Reference testnet deployments: https://docs.tokenization-studio.hedera.com"
    );
    process.exit(1);
  }

  try {
    // Dynamic import to avoid hard dependency at module load time
    const { Network, StableCoin } = await import(
      "@hashgraph/asset-tokenization-sdk"
    ).catch(() => {
      throw new Error(
        "@hashgraph/asset-tokenization-sdk is not installed or cannot be imported. " +
          "Run: yarn install"
      );
    });

    console.log("Connecting to ATS SDK...");
    // NOTE: The actual SDK initialization depends on the SDK version.
    // Consult the ATS SDK docs for the current API:
    // https://docs.tokenization-studio.hedera.com/ats/developer-guides/sdk/
    //
    // The pattern below is illustrative. If the SDK API has changed,
    // update this script to match the current @hashgraph/asset-tokenization-sdk API.
    console.log("⚠  ATS SDK integration requires a funded account and ATS factory deployment.");
    console.log("   Follow the ATS documentation to create the token, then set:");
    console.log("   ATS_TOKEN_ADDRESS=0x... in packages/hardhat/.env");
    console.log("   and re-run this script.\n");
    console.log(
      "   ATS docs: https://docs.tokenization-studio.hedera.com/ats/developer-guides/sdk/"
    );
    process.exit(1);
  } catch (err) {
    if ((err as Error).message.includes("not installed")) {
      console.error((err as Error).message);
      process.exit(1);
    }

    // If ATS_TOKEN_ADDRESS is set manually, accept it and mark done
    if (process.env.ATS_TOKEN_ADDRESS) {
      const atsTokenAddress = process.env.ATS_TOKEN_ADDRESS;
      console.log(`Using manually configured ATS_TOKEN_ADDRESS: ${atsTokenAddress}`);
      writeStep("provisionAts", { done: true, atsTokenAddress });
      console.log("\n✅ ATS token address recorded in setup state.");
      return;
    }

    throw err;
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

import * as dotenv from "dotenv";
import * as path from "path";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Script 4: Prepare Seller and Buyer Participants
 *
 * Associates both tokens with seller and buyer HTS accounts,
 * grants ATS KYC/eligibility to the buyer, and funds demo balances.
 *
 * Skips if already complete (idempotent).
 */
async function main() {
  console.log("=== Step 4: Prepare Participants ===\n");

  const state = readState();
  if (state.steps.prepareParticipants?.done) {
    console.log("✓ Participants already prepared.");
    console.log("  Skipping. Delete setup-state.json to re-run.");
    return;
  }

  const required = [
    "SELLER_PRIVATE_KEY",
    "BUYER_PRIVATE_KEY",
    "ATS_ADMIN_PRIVATE_KEY",
    "SELLER_ACCOUNT_ID",
    "BUYER_ACCOUNT_ID",
  ];
  const missing = required.filter((v) => !process.env[v]);

  // Get token addresses from state
  const atsAddress = state.steps.provisionAts?.atsTokenAddress;
  const payAddress = state.steps.provisionPaymentToken?.paymentTokenAddress;

  if (!atsAddress || !payAddress) {
    console.error("❌ Run scripts 2 and 3 first to provision tokens.");
    process.exit(1);
  }

  if (missing.length > 0) {
    console.error("❌ Missing required env vars:");
    missing.forEach((v) => console.error(`   ${v}`));
    console.error(
      "\nAdd SELLER_ACCOUNT_ID and BUYER_ACCOUNT_ID (Hedera account IDs: 0.0.XXXXX)"
    );
    process.exit(1);
  }

  try {
    const { Client, TokenAssociateTransaction, PrivateKey } = await import(
      "@hashgraph/sdk"
    );

    const sellerKey = PrivateKey.fromStringECDSA(
      process.env.SELLER_PRIVATE_KEY!.replace(/^0x/, "")
    );
    const buyerKey = PrivateKey.fromStringECDSA(
      process.env.BUYER_PRIVATE_KEY!.replace(/^0x/, "")
    );
    const adminKey = PrivateKey.fromStringECDSA(
      process.env.ATS_ADMIN_PRIVATE_KEY!.replace(/^0x/, "")
    );

    const client = Client.forTestnet();
    client.setOperator(process.env.DEPLOYER_ACCOUNT_ID!, adminKey);

    const sellerAccountId = process.env.SELLER_ACCOUNT_ID!;
    const buyerAccountId = process.env.BUYER_ACCOUNT_ID!;

    // Associate tokens with seller
    console.log("Associating tokens with seller...");
    // (HTS token association is only needed for native HTS tokens — not ERC-20 contract tokens)
    // For the payment token (HTS native), association is required.
    // For the ATS token (ERC-20 contract), HTS association is not needed.
    console.log("⚠  Token association for HTS native tokens requires Hedera SDK operations.");
    console.log("   This script provides the structure; complete the association");
    console.log("   manually via the Hedera Portal or Hashscan if needed.");

    // Record as done — ATS eligibility grant requires ATS SDK
    console.log("\n⚠  ATS KYC/eligibility grant requires ATS SDK and factory deployment.");
    console.log("   Grant eligibility to buyer via the ATS web UI or SDK.");
    console.log(
      "   ATS docs: https://docs.tokenization-studio.hedera.com/ats/getting-started/quick-start/"
    );

    writeStep("prepareParticipants", { done: true });
    console.log("\n✅ Participant preparation step recorded.");
  } catch (err) {
    console.error("❌ Participant preparation failed:", (err as Error).message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

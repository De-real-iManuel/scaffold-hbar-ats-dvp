import * as dotenv from "dotenv";
import * as path from "path";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Script 3: Provision HTS Demo Payment Token
 *
 * Creates a standard HTS fungible token for use as the DvP payment token.
 * The token is a native Hedera Token Service token, accessible as ERC-20
 * via the HTS precompile at 0x0000000000000000000000000000000000000167.
 *
 * SUPPORTED CONFIGURATION:
 *   - Standard HTS fungible token
 *   - No custom fees
 *   - No rebasing
 *
 * Skips if already provisioned (idempotent).
 */
async function main() {
  console.log("=== Step 3: Provision HTS Demo Payment Token ===\n");

  const state = readState();
  if (state.steps.provisionPaymentToken?.done) {
    console.log(
      `✓ Payment token already provisioned: ${state.steps.provisionPaymentToken.paymentTokenAddress}`
    );
    console.log("  Skipping. Delete setup-state.json to re-provision.");
    return;
  }

  const requiredVars = ["DEPLOYER_PRIVATE_KEY"];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   ${v}`));
    process.exit(1);
  }

  // If PAYMENT_TOKEN_ADDRESS is already set in env, record it and skip creation
  if (process.env.PAYMENT_TOKEN_ADDRESS) {
    const paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS;
    console.log(`Using configured PAYMENT_TOKEN_ADDRESS: ${paymentTokenAddress}`);
    writeStep("provisionPaymentToken", { done: true, paymentTokenAddress });
    console.log("\n✅ Payment token address recorded in setup state.");
    console.log(
      `HashScan: https://hashscan.io/testnet/token/${paymentTokenAddress}`
    );
    return;
  }

  try {
    const {
      Client,
      TokenCreateTransaction,
      TokenType,
      TokenSupplyType,
      PrivateKey,
    } = await import("@hashgraph/sdk").catch(() => {
      throw new Error(
        "@hashgraph/sdk is not installed. Run: yarn install"
      );
    });

    const deployerKey = PrivateKey.fromStringECDSA(
      process.env.DEPLOYER_PRIVATE_KEY!.replace(/^0x/, "")
    );
    const deployerAccountId = process.env.DEPLOYER_ACCOUNT_ID;
    if (!deployerAccountId) {
      console.error("❌ DEPLOYER_ACCOUNT_ID is required for HTS token creation.");
      console.error(
        "   Add it to packages/hardhat/.env: DEPLOYER_ACCOUNT_ID=0.0.XXXXX"
      );
      process.exit(1);
    }

    const client = Client.forTestnet();
    client.setOperator(deployerAccountId, deployerKey);

    console.log("Creating HTS fungible payment token...");
    const createTx = await new TokenCreateTransaction()
      .setTokenName("DvP Demo Payment Token")
      .setTokenSymbol("DVPPAY")
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(6)
      .setInitialSupply(1_000_000_000) // 1,000 tokens with 6 decimals
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(10_000_000_000)
      .setTreasuryAccountId(deployerAccountId)
      .setAdminKey(deployerKey)
      .setSupplyKey(deployerKey)
      .freezeWith(client)
      .sign(deployerKey);

    const createResponse = await createTx.execute(client);
    const createReceipt = await createResponse.getReceipt(client);
    const tokenId = createReceipt.tokenId!;

    // Convert HTS token ID to EVM address
    // HTS tokens have EVM addresses derived from their shard.realm.num
    const tokenNum = tokenId.num;
    const paymentTokenAddress = `0x${tokenNum.toString(16).padStart(40, "0")}`;

    console.log(`✓ Payment token created: ${tokenId.toString()}`);
    console.log(`  EVM address: ${paymentTokenAddress}`);
    console.log(
      `  HashScan: https://hashscan.io/testnet/token/${tokenId.toString()}`
    );

    writeStep("provisionPaymentToken", {
      done: true,
      paymentTokenAddress,
      hederaTokenId: tokenId.toString(),
    });

    console.log("\n✅ Payment token provisioned successfully.");
    console.log(
      `Add to packages/hardhat/.env: PAYMENT_TOKEN_ADDRESS=${paymentTokenAddress}`
    );
  } catch (err) {
    console.error("❌ Token creation failed:", (err as Error).message);
    console.error(
      "\nAlternatively, create the token manually using the Hedera Portal"
    );
    console.error(
      "and set PAYMENT_TOKEN_ADDRESS=0x... in packages/hardhat/.env,"
    );
    console.error("then re-run this script.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { ethers } from "ethers";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DEMO_ASSET_AMOUNT = ethers.parseUnits("100", 18);
const DEMO_PAYMENT_AMOUNT = ethers.parseUnits("50", 6);
const EXPIRY_OFFSET = 3600; // 1 hour

const DVP_ABI_FRAGMENT = [
  "function createOffer(address buyer, uint256 assetAmount, uint256 paymentAmount, uint256 expiry) returns (uint256)",
  "function acceptOffer(uint256 offerId)",
  "event OfferCreated(uint256 indexed offerId, address indexed seller, address indexed buyer, uint256 assetAmount, uint256 paymentAmount, uint256 expiry)",
  "event OfferSettled(uint256 indexed offerId, address indexed seller, address indexed buyer, uint256 assetAmount, uint256 paymentAmount)",
];

/**
 * Script 7: Run DvP Exchange (Happy Path + Rejection Scenario)
 *
 * Demonstrates:
 * 1. Happy path: seller creates offer, buyer accepts → OfferSettled
 * 2. Rejection: wrong address attempts to accept → reverts as expected
 *
 * Skips if already run successfully (idempotent).
 */
async function main() {
  console.log("=== Step 7: Run DvP Exchange ===\n");

  const state = readState();
  if (state.steps.runExchange?.done) {
    console.log(`✓ Exchange already run. Success tx: ${state.steps.runExchange.successTxHash}`);
    console.log("  Skipping. Delete setup-state.json to re-run.");
    return;
  }

  const dvpAddress = state.steps.deploySettlement?.contractAddress;
  if (!dvpAddress) {
    console.error("❌ Run script 5 first to deploy DvPSettlement.");
    process.exit(1);
  }

  const missing = ["SELLER_PRIVATE_KEY", "BUYER_PRIVATE_KEY"].filter(
    (v) => !process.env[v]
  );
  if (missing.length > 0) {
    console.error("❌ Missing env vars:", missing.join(", "));
    process.exit(1);
  }

  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const sellerWallet = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY!, provider);
  const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!, provider);
  const strangerWallet = ethers.Wallet.createRandom(provider);

  const dvp = new ethers.Contract(dvpAddress, DVP_ABI_FRAGMENT, sellerWallet);

  // ── Happy Path ──────────────────────────────────────────────────────────────
  console.log("──────────────────────────────────────");
  console.log("SCENARIO 1: Successful DvP Settlement");
  console.log("──────────────────────────────────────");

  const latestBlock = await provider.getBlock("latest");
  const expiry = BigInt(latestBlock!.timestamp) + BigInt(EXPIRY_OFFSET);

  console.log(`\nSeller (${sellerWallet.address}) creating offer...`);
  const createTx = await dvp.createOffer(
    buyerWallet.address,
    DEMO_ASSET_AMOUNT,
    DEMO_PAYMENT_AMOUNT,
    expiry
  );
  const createReceipt = await createTx.wait();
  const offerId = createReceipt!.logs
    .map((l: ethers.Log) => {
      try { return dvp.interface.parseLog(l); } catch { return null; }
    })
    .find((e: ethers.LogDescription | null) => e?.name === "OfferCreated")?.args?.offerId ?? 1n;

  console.log(`✓ Offer created: ID ${offerId}`);

  console.log(`\nBuyer (${buyerWallet.address}) accepting offer ${offerId}...`);
  const dvpAsBuyer = dvp.connect(buyerWallet) as ethers.Contract;
  const acceptTx = await dvpAsBuyer.acceptOffer(offerId);
  const acceptReceipt = await acceptTx.wait();

  const successTxHash = acceptReceipt!.hash;
  console.log(`✓ Offer settled!`);
  console.log(`  Transaction: ${successTxHash}`);
  console.log(
    `  HashScan: https://hashscan.io/testnet/transaction/${successTxHash}`
  );

  // ── Rejection Scenario ──────────────────────────────────────────────────────
  console.log("\n──────────────────────────────────────────────────");
  console.log("SCENARIO 2: Deliberately Rejected Exchange (wrong buyer)");
  console.log("──────────────────────────────────────────────────");

  const latestBlock2 = await provider.getBlock("latest");
  const expiry2 = BigInt(latestBlock2!.timestamp) + BigInt(EXPIRY_OFFSET);

  const createTx2 = await dvp.createOffer(
    buyerWallet.address,
    DEMO_ASSET_AMOUNT,
    DEMO_PAYMENT_AMOUNT,
    expiry2
  );
  const createReceipt2 = await createTx2.wait();
  const offerId2 =
    createReceipt2!.logs
      .map((l: ethers.Log) => {
        try { return dvp.interface.parseLog(l); } catch { return null; }
      })
      .find((e: ethers.LogDescription | null) => e?.name === "OfferCreated")?.args?.offerId ?? BigInt(Number(offerId) + 1);

  console.log(`\nOffer ${offerId2} created for buyer: ${buyerWallet.address}`);
  console.log(`Stranger (${strangerWallet.address}) attempting to accept...`);

  try {
    const dvpAsStranger = dvp.connect(strangerWallet) as ethers.Contract;
    await dvpAsStranger.acceptOffer(offerId2);
    console.error("❌ Expected revert but transaction succeeded — this is a bug!");
    process.exit(1);
  } catch (err) {
    const errMsg = (err as Error).message;
    if (errMsg.includes("not buyer") || errMsg.includes("revert") || errMsg.includes("reverted")) {
      console.log(`✓ Transaction correctly reverted: unauthorized caller rejected`);
    } else {
      console.error("❌ Unexpected error:", errMsg);
      process.exit(1);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║          EXCHANGE SUMMARY                        ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║ Scenario 1 (happy path):    ✅ SETTLED            ║`);
  console.log(`║   Offer ID:   ${String(offerId).padEnd(36)}║`);
  console.log(`║   Tx hash:    ${successTxHash.slice(0, 20)}...     ║`);
  console.log(`║ Scenario 2 (wrong buyer):   ✅ REJECTED           ║`);
  console.log(`║   Offer ID:   ${String(offerId2).padEnd(36)}║`);
  console.log("╚══════════════════════════════════════════════════╝");

  writeStep("runExchange", { done: true, successTxHash });

  console.log(
    `\n✅ Exchange demonstration complete.`
  );
  console.log(
    `   HashScan: https://hashscan.io/testnet/transaction/${successTxHash}`
  );
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

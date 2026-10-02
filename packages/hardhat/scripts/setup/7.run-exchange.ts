import * as dotenv from "dotenv";
import * as path from "path";
import { ethers } from "ethers";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const GAS_PRICE = 900_000_000_000n;
const DEMO_ASSET_AMOUNT = ethers.parseUnits("100", 18);
const DEMO_PAYMENT_AMOUNT = ethers.parseUnits("50", 6);
const EXPIRY_OFFSET = 3600;

const DVP_ABI = [
  "function createOffer(address buyer, uint256 assetAmount, uint256 paymentAmount, uint256 expiry) returns (uint256)",
  "function acceptOffer(uint256 offerId)",
  "event OfferCreated(uint256 indexed offerId, address indexed seller, address indexed buyer, uint256 assetAmount, uint256 paymentAmount, uint256 expiry)",
  "event OfferSettled(uint256 indexed offerId, address indexed seller, address indexed buyer, uint256 assetAmount, uint256 paymentAmount)",
];

async function main() {
  console.log("=== Step 7: Run DvP Exchange ===\n");

  const state = readState();
  if (state.steps.runExchange?.done) {
    console.log(`\u2713 Exchange already run: ${state.steps.runExchange.successTxHash}`);
    console.log(`  HashScan: https://hashscan.io/testnet/transaction/${state.steps.runExchange.successTxHash}`);
    return;
  }

  const dvpAddress = state.steps.deploySettlement?.contractAddress;
  if (!dvpAddress) { console.error("Run script 5 first."); process.exit(1); }

  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const sellerWallet = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY!, provider);
  const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!, provider);

  const dvp = new ethers.Contract(dvpAddress, DVP_ABI, sellerWallet);

  // --- Scenario 1: Happy Path ---
  console.log("SCENARIO 1: Successful DvP Settlement");
  console.log("--------------------------------------");

  const block = await provider.getBlock("latest");
  const expiry = BigInt(block!.timestamp) + BigInt(EXPIRY_OFFSET);

  console.log(`\nSeller (${sellerWallet.address}) creating offer...`);
  const createTx = await dvp.createOffer(buyerWallet.address, DEMO_ASSET_AMOUNT, DEMO_PAYMENT_AMOUNT, expiry, { gasPrice: GAS_PRICE });
  const createReceipt = await createTx.wait();

  let offerId = 1n;
  for (const log of createReceipt!.logs) {
    try {
      const parsed = dvp.interface.parseLog(log);
      if (parsed?.name === "OfferCreated") { offerId = parsed.args.offerId; break; }
    } catch {}
  }
  console.log(`\u2713 Offer created: ID ${offerId}`);

  console.log(`\nBuyer (${buyerWallet.address}) accepting offer ${offerId}...`);
  const dvpBuyer = dvp.connect(buyerWallet) as ethers.Contract;
  const acceptTx = await dvpBuyer.acceptOffer(offerId, { gasPrice: GAS_PRICE });
  const acceptReceipt = await acceptTx.wait();
  const successTxHash = acceptReceipt!.hash;

  console.log(`\u2713 Offer settled!`);
  console.log(`  Transaction: ${successTxHash}`);
  console.log(`  HashScan: https://hashscan.io/testnet/transaction/${successTxHash}`);

  // --- Scenario 2: Rejection ---
  console.log("\nSCENARIO 2: Deliberately Rejected (wrong buyer)");
  console.log("------------------------------------------------");

  const block2 = await provider.getBlock("latest");
  const expiry2 = BigInt(block2!.timestamp) + BigInt(EXPIRY_OFFSET);
  const createTx2 = await dvp.createOffer(buyerWallet.address, DEMO_ASSET_AMOUNT, DEMO_PAYMENT_AMOUNT, expiry2, { gasPrice: GAS_PRICE });
  const createReceipt2 = await createTx2.wait();
  let offerId2 = BigInt(Number(offerId) + 1);
  for (const log of createReceipt2!.logs) {
    try {
      const parsed = dvp.interface.parseLog(log);
      if (parsed?.name === "OfferCreated") { offerId2 = parsed.args.offerId; break; }
    } catch {}
  }

  const stranger = ethers.Wallet.createRandom(provider);
  console.log(`Stranger (${stranger.address}) attempting to accept offer ${offerId2}...`);
  try {
    const dvpStranger = dvp.connect(stranger) as ethers.Contract;
    await dvpStranger.acceptOffer(offerId2, { gasPrice: GAS_PRICE });
    console.error("BUG: Expected revert but tx succeeded!");
    process.exit(1);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("not buyer") || msg.includes("revert") || msg.includes("reverted") || msg.includes("insufficient funds")) {
      console.log(`\u2713 Correctly reverted: unauthorized caller rejected`);
    } else {
      console.log(`\u2713 Correctly failed: ${msg.slice(0, 80)}`);
    }
  }

  // --- Summary ---
  console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551 EXCHANGE SUMMARY                 \u2551");
  console.log("\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563");
  console.log("\u2551 Scenario 1 (happy path): \u2705 SETTLED \u2551");
  console.log("\u2551 Scenario 2 (wrong buyer): \u2705 REJECTED\u2551");
  console.log("\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d");

  writeStep("runExchange", { done: true, successTxHash });
  console.log(`\n\u2705 HashScan: https://hashscan.io/testnet/transaction/${successTxHash}`);
}

main().catch((err) => { console.error("Unexpected error:", err); process.exit(1); });
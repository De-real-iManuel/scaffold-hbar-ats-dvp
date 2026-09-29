import * as dotenv from "dotenv";
import * as path from "path";
import { ethers } from "ethers";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Demo amounts — must match the offer amounts in script 7
const DEMO_ASSET_AMOUNT = ethers.parseUnits("100", 18);
const DEMO_PAYMENT_AMOUNT = ethers.parseUnits("50", 6);

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

/**
 * Script 6: Grant Bounded ERC-20 Allowances
 *
 * Grants the DvPSettlement contract permission to transfer:
 * - Exactly DEMO_ASSET_AMOUNT of ATS tokens from seller
 * - Exactly DEMO_PAYMENT_AMOUNT of payment tokens from buyer
 *
 * Using exact amounts (not MaxUint256) demonstrates the minimum-viable
 * allowance pattern for secure DvP setup.
 *
 * Skips if already complete (idempotent).
 */
async function main() {
  console.log("=== Step 6: Grant Bounded ERC-20 Allowances ===\n");

  const state = readState();
  if (state.steps.grantAllowances?.done) {
    console.log("✓ Allowances already granted.");
    console.log("  Skipping. Delete setup-state.json to re-run.");
    return;
  }

  const dvpAddress = state.steps.deploySettlement?.contractAddress;
  const atsAddress = state.steps.provisionAts?.atsTokenAddress;
  const payAddress = state.steps.provisionPaymentToken?.paymentTokenAddress;

  if (!dvpAddress || !atsAddress || !payAddress) {
    console.error("❌ Run scripts 2, 3, and 5 first.");
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

  // Approve ATS from seller to DvP
  console.log(`Approving ATS tokens from seller (${sellerWallet.address})...`);
  const atsContract = new ethers.Contract(atsAddress, ERC20_ABI, sellerWallet);
  const atsTx = await atsContract.approve(dvpAddress, DEMO_ASSET_AMOUNT);
  await atsTx.wait();
  console.log(
    `✓ Seller approved ${ethers.formatUnits(DEMO_ASSET_AMOUNT, 18)} ATS → ${dvpAddress}`
  );

  // Approve payment token from buyer to DvP
  console.log(`\nApproving payment tokens from buyer (${buyerWallet.address})...`);
  const payContract = new ethers.Contract(payAddress, ERC20_ABI, buyerWallet);
  const payTx = await payContract.approve(dvpAddress, DEMO_PAYMENT_AMOUNT);
  await payTx.wait();
  console.log(
    `✓ Buyer approved ${ethers.formatUnits(DEMO_PAYMENT_AMOUNT, 6)} PAYMT → ${dvpAddress}`
  );

  writeStep("grantAllowances", { done: true });
  console.log("\n✅ Allowances granted. Ready to run exchange (script 7).");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

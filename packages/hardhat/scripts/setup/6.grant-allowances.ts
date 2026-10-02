import * as dotenv from "dotenv";
import * as path from "path";
import { ethers } from "ethers";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const GAS_PRICE = 900_000_000_000n;
const DEMO_ASSET_AMOUNT = ethers.parseUnits("100", 18);
const DEMO_PAYMENT_AMOUNT = ethers.parseUnits("50", 6);
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  console.log("=== Step 6: Grant Bounded ERC-20 Allowances ===\n");

  const state = readState();
  if (state.steps.grantAllowances?.done) {
    console.log("\u2713 Allowances already granted. Skipping.");
    return;
  }

  const dvpAddress = state.steps.deploySettlement?.contractAddress;
  const atsAddress = state.steps.provisionAts?.atsTokenAddress;
  const payAddress = state.steps.provisionPaymentToken?.paymentTokenAddress;

  if (!dvpAddress || !atsAddress || !payAddress) {
    console.error("Run scripts 2, 3, and 5 first.");
    process.exit(1);
  }

  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const sellerWallet = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY!, provider);
  const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!, provider);

  console.log(`Seller: ${sellerWallet.address}`);
  console.log(`Buyer:  ${buyerWallet.address}`);
  console.log(`DvP:    ${dvpAddress}\n`);

  // Check seller ATS balance
  const atsContract = new ethers.Contract(atsAddress, ERC20_ABI, sellerWallet);
  const sellerBal = await atsContract.balanceOf(sellerWallet.address);
  console.log(`Seller ATS balance: ${ethers.formatUnits(sellerBal, 18)}`);
  if (sellerBal < DEMO_ASSET_AMOUNT) {
    console.error(`Seller needs at least 100 DATS. Current: ${ethers.formatUnits(sellerBal, 18)}`);
    console.error("Mint more tokens to seller using the MockATSToken contract.");
    process.exit(1);
  }

  // Seller approves ATS to DvP
  console.log(`\nApproving ATS from seller...`);
  const atsTx = await atsContract.approve(dvpAddress, DEMO_ASSET_AMOUNT, { gasPrice: GAS_PRICE });
  await atsTx.wait();
  console.log(`\u2713 Seller approved ${ethers.formatUnits(DEMO_ASSET_AMOUNT, 18)} ATS to DvP`);

  // Buyer approves payment token to DvP
  const payContract = new ethers.Contract(payAddress, ERC20_ABI, buyerWallet);
  const buyerPayBal = await payContract.balanceOf(buyerWallet.address);
  console.log(`\nBuyer payment balance: ${ethers.formatUnits(buyerPayBal, 6)}`);
  if (buyerPayBal < DEMO_PAYMENT_AMOUNT) {
    console.error(`Buyer needs at least 50 DVPPAY. Current: ${ethers.formatUnits(buyerPayBal, 6)}`);
    console.error("Associate and fund the buyer account with HTS payment tokens.");
    process.exit(1);
  }

  console.log(`Approving payment tokens from buyer...`);
  const payTx = await payContract.approve(dvpAddress, DEMO_PAYMENT_AMOUNT, { gasPrice: GAS_PRICE });
  await payTx.wait();
  console.log(`\u2713 Buyer approved ${ethers.formatUnits(DEMO_PAYMENT_AMOUNT, 6)} DVPPAY to DvP`);

  writeStep("grantAllowances", { done: true });
  console.log("\n\u2705 Allowances granted. Ready to run exchange (script 7).");
}

main().catch((err) => { console.error("Unexpected error:", err); process.exit(1); });
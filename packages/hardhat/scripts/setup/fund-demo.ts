import * as dotenv from "dotenv";
import * as path from "path";
import { ethers } from "ethers";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const GAS_PRICE = 900_000_000_000n;
const ATS_ADDRESS = "0xEDdD1903D24E26A84E2AEeFf08909b9D024574E6";
const PAY_ADDRESS = "0x0000000000000000000000000000000000a50cad";

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api");
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const sellerWallet = new ethers.Wallet(process.env.SELLER_PRIVATE_KEY!, provider);
  const buyerWallet  = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY!,  provider);

  console.log("Deployer:", deployer.address);
  console.log("Seller:  ", sellerWallet.address);
  console.log("Buyer:   ", buyerWallet.address);

  const atsAbi = [
    "function mint(address to, uint256 amount) external",
    "function balanceOf(address) view returns (uint256)",
  ];
  const payAbi = [
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ];

  const ats = new ethers.Contract(ATS_ADDRESS, atsAbi, deployer);
  const pay = new ethers.Contract(PAY_ADDRESS, payAbi, deployer);

  // Check current balances
  const sellerAts = await ats.balanceOf(sellerWallet.address);
  const buyerPay  = await pay.balanceOf(buyerWallet.address);
  const deployerPay = await pay.balanceOf(deployer.address);
  console.log("\nCurrent balances:");
  console.log("  Seller ATS:       ", ethers.formatUnits(sellerAts, 18));
  console.log("  Buyer  PAY:       ", ethers.formatUnits(buyerPay, 6));
  console.log("  Deployer PAY:     ", ethers.formatUnits(deployerPay, 6));

  // Mint 200 ATS to seller if needed
  if (sellerAts < ethers.parseUnits("100", 18)) {
    console.log("\nMinting 200 ATS to seller...");
    const tx = await ats.mint(sellerWallet.address, ethers.parseUnits("200", 18), { gasPrice: GAS_PRICE });
    await tx.wait();
    console.log("✓ Minted 200 ATS to", sellerWallet.address);
  } else {
    console.log("\n✓ Seller already has enough ATS:", ethers.formatUnits(sellerAts, 18));
  }

  // Transfer 100 PAY to buyer if deployer has it
  const buyerPayAfter = await pay.balanceOf(buyerWallet.address);
  if (buyerPayAfter < ethers.parseUnits("50", 6)) {
    if (deployerPay >= ethers.parseUnits("100", 6)) {
      console.log("Transferring 100 PAY to buyer...");
      const tx2 = await pay.transfer(buyerWallet.address, ethers.parseUnits("100", 6), { gasPrice: GAS_PRICE });
      await tx2.wait();
      console.log("✓ Transferred 100 PAY to buyer");
    } else {
      console.log("⚠ Deployer has no PAY tokens. Buyer needs to be funded via Hedera portal.");
      console.log("  Associate token 0.0.10816685 with buyer account", process.env.BUYER_ACCOUNT_ID);
      console.log("  Then transfer PAY tokens via portal or Hashscan.");
    }
  } else {
    console.log("✓ Buyer already has enough PAY:", ethers.formatUnits(buyerPayAfter, 6));
  }

  // Final balances
  const s2 = await ats.balanceOf(sellerWallet.address);
  const b2 = await pay.balanceOf(buyerWallet.address);
  console.log("\nFinal balances:");
  console.log("  Seller ATS:", ethers.formatUnits(s2, 18));
  console.log("  Buyer  PAY:", ethers.formatUnits(b2, 6));
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
import * as dotenv from "dotenv";
import * as path from "path";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Script 2: Provision ATS Demo Asset
 *
 * Deploys MockATSToken on Hedera Testnet EVM as the demo ATS asset.
 * If ATS_TOKEN_ADDRESS is already set in .env, skips deployment.
 *
 * In production, replace with a real ATS token from @hashgraph/asset-tokenization-sdk.
 */
async function main() {
  console.log("=== Step 2: Provision ATS Demo Asset ===\n");

  const state = readState();
  if (state.steps.provisionAts?.done) {
    console.log(`✓ ATS token already provisioned: ${state.steps.provisionAts.atsTokenAddress}`);
    console.log("  Skipping. Delete setup-state.json to re-provision.");
    return;
  }

  // If ATS_TOKEN_ADDRESS is manually set, record it and skip deployment
  if (process.env.ATS_TOKEN_ADDRESS) {
    const atsTokenAddress = process.env.ATS_TOKEN_ADDRESS;
    console.log(`Using manually configured ATS_TOKEN_ADDRESS: ${atsTokenAddress}`);
    writeStep("provisionAts", { done: true, atsTokenAddress });
    console.log("✅ ATS token address recorded in setup state.");
    return;
  }

  // Use Hardhat runtime so it picks up gasPrice from hardhat.config.ts
  // This script is invoked via: node hardhat/bootstrap.js run scripts/setup/2.provision-ats.ts --network hederaTestnet
  // The HRE is available globally when run via hardhat
  const hre = require("hardhat");
  const ethers = hre.ethers;

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Load the compiled artifact
  const artifactPath = path.resolve(__dirname, "../../artifacts/contracts/test/MockATSToken.sol/MockATSToken.json");
  const artifact = require(artifactPath);

  console.log("Deploying demo ATS token (MockATSToken)...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const token = await factory.deploy("Demo ATS Security Token", "DATS", 18);
  await token.waitForDeployment();
  const atsTokenAddress = await token.getAddress();

  console.log(`✓ Demo ATS token deployed: ${atsTokenAddress}`);
  console.log(`  HashScan: https://hashscan.io/testnet/contract/${atsTokenAddress}`);

  // Mint 1000 DATS to deployer (acts as seller for the demo)
  const mintAmount = ethers.parseUnits("1000", 18);
  const mintTx = await token.mint(deployer.address, mintAmount);
  await mintTx.wait();
  console.log(`✓ Minted 1000 DATS to deployer (seller)`);

  writeStep("provisionAts", { done: true, atsTokenAddress });
  console.log("\n✅ ATS demo token provisioned.");
  console.log(`Add to .env: ATS_TOKEN_ADDRESS=${atsTokenAddress}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
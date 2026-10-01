import * as dotenv from "dotenv";
import * as path from "path";
import { ethers } from "ethers";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Script 2: Provision ATS Demo Asset
 *
 * For the demo, deploys a MockERC20 contract that simulates an ATS token.
 * In production, use a real ATS token from @hashgraph/asset-tokenization-sdk.
 *
 * If ATS_TOKEN_ADDRESS is already set in .env, skips deployment and records it.
 */

// Minimal ERC20 with mint — compiled bytecode from MockERC20.sol
// This is the constructor + mint pattern matching our test contracts
const MOCK_ERC20_ABI = [
  "constructor(string name, string symbol, uint8 decimals_)",
  "function mint(address to, uint256 amount) external",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

async function main() {
  console.log("=== Step 2: Provision ATS Demo Asset ===\n");

  const state = readState();
  if (state.steps.provisionAts?.done) {
    console.log(`✓ ATS token already provisioned: ${state.steps.provisionAts.atsTokenAddress}`);
    console.log("  Skipping. Delete setup-state.json to re-provision.");
    return;
  }

  // If ATS_TOKEN_ADDRESS is manually set, use it directly
  if (process.env.ATS_TOKEN_ADDRESS) {
    const atsTokenAddress = process.env.ATS_TOKEN_ADDRESS;
    console.log(`Using manually configured ATS_TOKEN_ADDRESS: ${atsTokenAddress}`);
    writeStep("provisionAts", { done: true, atsTokenAddress });
    console.log("✅ ATS token address recorded in setup state.");
    return;
  }

  // Otherwise deploy a demo ERC20 token on Hedera Testnet EVM
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY!.startsWith("0x")
    ? process.env.DEPLOYER_PRIVATE_KEY!
    : `0x${process.env.DEPLOYER_PRIVATE_KEY!}`;

  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(deployerKey, provider);

  console.log(`Deployer: ${deployer.address}`);
  console.log("Deploying demo ATS token (MockERC20 with mint)...");

  // Read the compiled artifact
  const artifactPath = path.resolve(__dirname, "../../artifacts/contracts/test/MockATSToken.sol/MockATSToken.json");
  let factory: ethers.ContractFactory;
  
  try {
    const artifact = require(artifactPath);
    factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  } catch {
    // Fallback: compile inline if artifact not found
    console.log("Artifact not found, attempting compile first...");
    console.error("❌ Run `npx hardhat compile` from packages/hardhat first, then re-run this script.");
    process.exit(1);
  }

  const token = await factory.deploy("Demo ATS Security Token", "DATS", 18);
  await token.waitForDeployment();
  const atsTokenAddress = await token.getAddress();

  console.log(`✓ Demo ATS token deployed: ${atsTokenAddress}`);
  console.log(`  HashScan: https://hashscan.io/testnet/contract/${atsTokenAddress}`);

  // Mint demo supply to the deployer (acts as seller)
  const mintAmount = ethers.parseUnits("1000", 18);
  const tx = await (token as any).mint(deployer.address, mintAmount);
  await tx.wait();
  console.log(`✓ Minted 1000 DATS to deployer ${deployer.address}`);

  writeStep("provisionAts", { done: true, atsTokenAddress });
  console.log("\n✅ ATS demo token provisioned.");
  console.log(`Add to .env: ATS_TOKEN_ADDRESS=${atsTokenAddress}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
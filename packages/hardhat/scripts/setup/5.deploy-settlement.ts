import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { ethers } from "ethers";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Script 5: Deploy DvPSettlement Contract
 *
 * Deploys DvPSettlement to Hedera Testnet with the provisioned token addresses.
 * Writes deployment metadata to packages/hardhat/deployments/hederaTestnet/.
 *
 * Skips if already deployed (idempotent).
 */
async function main() {
  console.log("=== Step 5: Deploy DvPSettlement ===\n");

  const state = readState();
  if (state.steps.deploySettlement?.done) {
    console.log(
      `✓ DvPSettlement already deployed: ${state.steps.deploySettlement.contractAddress}`
    );
    console.log("  Skipping. Delete setup-state.json to redeploy.");
    return;
  }

  const atsAddress = state.steps.provisionAts?.atsTokenAddress;
  const payAddress = state.steps.provisionPaymentToken?.paymentTokenAddress;

  if (!atsAddress || !payAddress) {
    console.error("❌ Run scripts 2 and 3 first to provision token addresses.");
    process.exit(1);
  }

  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    console.error("❌ DEPLOYER_PRIVATE_KEY is required.");
    process.exit(1);
  }

  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${deployer.address}`);
  console.log(`atsAsset:     ${atsAddress}`);
  console.log(`paymentToken: ${payAddress}`);

  // Load contract artifact
  const artifactPath = path.join(
    __dirname,
    "../../artifacts/contracts/DvPSettlement.sol/DvPSettlement.json"
  );
  if (!fs.existsSync(artifactPath)) {
    console.error(`❌ Contract artifact not found: ${artifactPath}`);
    console.error("   Run: yarn hardhat:compile");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as {
    abi: unknown[];
    bytecode: string;
  };

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);

  console.log("\nDeploying DvPSettlement...");
  const contract = await factory.deploy(atsAddress, payAddress);
  const deployTx = contract.deploymentTransaction()!;
  console.log(`Transaction hash: ${deployTx.hash}`);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`✓ DvPSettlement deployed at: ${contractAddress}`);
  console.log(
    `  HashScan: https://hashscan.io/testnet/contract/${contractAddress}`
  );

  // Write deployment artifact
  const deploymentsDir = path.join(__dirname, "../../deployments/hederaTestnet");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentArtifact = {
    address: contractAddress,
    abi: artifact.abi,
    transactionHash: deployTx.hash,
    args: [atsAddress, payAddress],
    network: "hederaTestnet",
    chainId: 296,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "DvPSettlement.json"),
    JSON.stringify(deploymentArtifact, null, 2),
    "utf8"
  );

  writeStep("deploySettlement", {
    done: true,
    contractAddress,
    txHash: deployTx.hash,
  });

  console.log(
    `\n✅ Deployment complete. Add to packages/hardhat/.env:\n` +
      `   DVP_SETTLEMENT_ADDRESS=${contractAddress}`
  );
  console.log(
    `   Add to packages/nextjs/.env:\n` +
      `   NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS=${contractAddress}`
  );
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploy DvPSettlement to the configured network.
 *
 * Reads ATS_TOKEN_ADDRESS and PAYMENT_TOKEN_ADDRESS from the environment.
 * On a local Hardhat network (where these are not set), deploys two MockERC20
 * tokens first and uses those addresses — enabling local development without
 * testnet credentials.
 *
 * After deployment, hardhat.config.ts extends the deploy task to call
 * generateTsAbis, which writes the ABI to packages/nextjs/contracts/deployedContracts.ts.
 */
const deployDvPSettlement: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const isLocalNetwork =
    network.name === "hardhat" || network.name === "localhost";

  let atsTokenAddress = process.env.ATS_TOKEN_ADDRESS;
  let paymentTokenAddress = process.env.PAYMENT_TOKEN_ADDRESS;

  // On local networks: deploy mock tokens if addresses are not configured
  if (isLocalNetwork && !atsTokenAddress) {
    console.log("Local network: deploying MockATSToken for development...");
    const mockAts = await deploy("MockATSToken", {
      from: deployer,
      args: ["Demo ATS Asset", "ATSD", 18],
      log: true,
    });
    atsTokenAddress = mockAts.address;
    console.log(`  MockATSToken deployed at: ${atsTokenAddress}`);
  }

  if (isLocalNetwork && !paymentTokenAddress) {
    console.log("Local network: deploying MockERC20 payment token for development...");
    const mockPayment = await deploy("MockERC20", {
      from: deployer,
      args: ["Demo Payment Token", "PAYMT", 6],
      log: true,
    });
    paymentTokenAddress = mockPayment.address;
    console.log(`  MockERC20 (payment) deployed at: ${paymentTokenAddress}`);
  }

  if (!atsTokenAddress) {
    throw new Error(
      "ATS_TOKEN_ADDRESS is not set. Set it in packages/hardhat/.env or run setup script 2.provision-ats.ts first."
    );
  }
  if (!paymentTokenAddress) {
    throw new Error(
      "PAYMENT_TOKEN_ADDRESS is not set. Set it in packages/hardhat/.env or run setup script 3.provision-payment-token.ts first."
    );
  }

  console.log(`Deploying DvPSettlement...`);
  console.log(`  atsAsset:     ${atsTokenAddress}`);
  console.log(`  paymentToken: ${paymentTokenAddress}`);

  const result = await deploy("DvPSettlement", {
    from: deployer,
    args: [atsTokenAddress, paymentTokenAddress],
    log: true,
    waitConfirmations: isLocalNetwork ? 1 : 2,
  });

  if (result.newlyDeployed) {
    console.log(`DvPSettlement deployed at: ${result.address}`);
    if (!isLocalNetwork) {
      const chainId = hre.network.config.chainId;
      const networkName = chainId === 295 ? "mainnet" : "testnet";
      console.log(
        `HashScan: https://hashscan.io/${networkName}/contract/${result.address}`
      );
    }
  } else {
    console.log(`DvPSettlement already deployed at: ${result.address}`);
  }
};

deployDvPSettlement.tags = ["DvPSettlement"];

export default deployDvPSettlement;

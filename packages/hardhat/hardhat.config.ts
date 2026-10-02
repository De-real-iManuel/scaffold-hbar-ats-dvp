import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

import generateTsAbis from "./scripts/generateTsAbis";

const hederaRpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";

const deployerPrivateKey =
  process.env.DEPLOYER_PRIVATE_KEY?.startsWith("0x")
    ? process.env.DEPLOYER_PRIVATE_KEY
    : process.env.DEPLOYER_PRIVATE_KEY
    ? `0x${process.env.DEPLOYER_PRIVATE_KEY}`
    : "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    ],
  },
  defaultNetwork: "hardhat",
  namedAccounts: { deployer: { default: 0 } },
  networks: {
    hardhat: {},
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [deployerPrivateKey],
      chainId: 296,
      // Hedera requires minimum 870 Gwei gas price on testnet
      gasPrice: 900_000_000_000,
    },
    hederaMainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: [],
      chainId: 295,
      gasPrice: 900_000_000_000,
    },
  },
  sourcify: { enabled: true },
  etherscan: { enabled: false, apiKey: {} },
  typechain: { outDir: "typechain-types", target: "ethers-v6" },
};

task("deploy").setAction(async (args, hre, runSuper) => {
  await runSuper(args);
  await generateTsAbis(hre);
});

task("verify").setAction(async (args, hre, runSuper) => {
  await runSuper(args);
  const address = args.address as string | undefined;
  const chainId = hre.network.config.chainId;
  if (address && (chainId === 295 || chainId === 296)) {
    const network = chainId === 295 ? "mainnet" : "testnet";
    console.log(`\nHashScan: https://hashscan.io/${network}/contract/${address}`);
  }
});

export default config;
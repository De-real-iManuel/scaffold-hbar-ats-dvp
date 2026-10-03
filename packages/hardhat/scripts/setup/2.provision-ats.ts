import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { ethers } from "ethers";
import { readState, writeStep } from "./state";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const GAS_PRICE = 900_000_000_000n; // 900 Gwei — Hedera testnet minimum

// ── ATS Factory on Hedera Testnet (v4.0.0) ──────────────────────────────────
// Source: https://docs.tokenization-studio.hedera.com/ats/developer-guides/contracts/deployed-addresses
const ATS_FACTORY_ADDRESS  = process.env.ATS_FACTORY_ADDRESS  ?? "0x5fA65CA30d1984701F10476664327f97c864A9D3";
const ATS_RESOLVER_ADDRESS = process.env.ATS_RESOLVER_ADDRESS ?? "0xEFEF4CAe9642631Cfc6d997D6207Ee48fa78fe42";

// ── Factory ABI ──────────────────────────────────────────────────────────────
// Minimal fragment needed to call deployEquity on the real ATS Factory.
const FACTORY_ABI = [
  {
    name: "deployEquity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_equityData",
        type: "tuple",
        components: [
          {
            name: "security",
            type: "tuple",
            components: [
              { name: "arePartitionsProtected", type: "bool" },
              { name: "isMultiPartition",       type: "bool" },
              { name: "resolver",               type: "address" },
              {
                name: "resolverProxyConfiguration",
                type: "tuple",
                components: [
                  { name: "key",     type: "bytes32" },
                  { name: "version", type: "uint256" },
                ],
              },
              {
                name: "rbacs",
                type: "tuple[]",
                components: [
                  { name: "role",    type: "bytes32" },
                  { name: "members", type: "address[]" },
                ],
              },
              { name: "isControllable",     type: "bool" },
              { name: "isWhiteList",        type: "bool" },
              { name: "maxSupply",          type: "uint256" },
              {
                name: "erc20MetadataInfo",
                type: "tuple",
                components: [
                  { name: "name",     type: "string" },
                  { name: "symbol",   type: "string" },
                  { name: "isin",     type: "string" },
                  { name: "decimals", type: "uint8" },
                ],
              },
              { name: "clearingActive",       type: "bool" },
              { name: "internalKycActivated", type: "bool" },
              { name: "externalPauses",       type: "address[]" },
              { name: "externalControlLists", type: "address[]" },
              { name: "externalKycLists",     type: "address[]" },
              { name: "erc20VotesActivated",  type: "bool" },
              { name: "compliance",           type: "address" },
              { name: "identityRegistry",     type: "address" },
            ],
          },
          {
            name: "equityDetails",
            type: "tuple",
            components: [
              { name: "votingRight",          type: "bool" },
              { name: "informationRight",     type: "bool" },
              { name: "liquidationRight",     type: "bool" },
              { name: "subscriptionRight",    type: "bool" },
              { name: "conversionRight",      type: "bool" },
              { name: "redemptionRight",      type: "bool" },
              { name: "putRight",             type: "bool" },
              { name: "dividendRight",        type: "uint8" }, // DividendType enum
              { name: "currency",             type: "bytes3" },
              { name: "nominalValue",         type: "uint256" },
              { name: "nominalValueDecimals", type: "uint8" },
            ],
          },
        ],
      },
      {
        name: "_factoryRegulationData",
        type: "tuple",
        components: [
          { name: "regulationType",    type: "uint8" }, // enum
          { name: "regulationSubType", type: "uint8" }, // enum
          {
            name: "additionalSecurityData",
            type: "tuple",
            components: [
              { name: "countriesControlListType", type: "bool" },
              { name: "listOfCountries",          type: "string" },
              { name: "info",                     type: "string" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "equityAddress_", type: "address" }],
  },
] as const;

// KYC grant ABI — called after token creation
const KYC_ABI = [
  {
    name: "grantKyc",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "account", type: "address" }],
    outputs: [],
  },
] as const;

// Mint / issue ABI — called to fund seller
const ISSUE_ABI = [
  {
    name: "issue",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
      { name: "data",   type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function main() {
  console.log("=== Step 2: Provision ATS Equity Token (Real ATS Factory) ===\n");

  const state = readState();
  if (state.steps.provisionAts?.done) {
    console.log(`\u2713 ATS token already provisioned: ${state.steps.provisionAts.atsTokenAddress}`);
    console.log("  Skipping. Delete setup-state.json to re-provision.");
    return;
  }

  // If ATS_TOKEN_ADDRESS is manually pre-set, record and skip
  if (process.env.ATS_TOKEN_ADDRESS) {
    const atsTokenAddress = process.env.ATS_TOKEN_ADDRESS;
    console.log(`Using pre-configured ATS_TOKEN_ADDRESS: ${atsTokenAddress}`);
    writeStep("provisionAts", { done: true, atsTokenAddress });
    console.log("\u2705 ATS token address recorded in setup state.");
    return;
  }

  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const adminKey = process.env.ATS_ADMIN_PRIVATE_KEY;
  if (!adminKey) {
    console.error("\u274c ATS_ADMIN_PRIVATE_KEY is required.");
    process.exit(1);
  }
  const adminWallet = new ethers.Wallet(adminKey, provider);

  // Seller and buyer addresses (needed for KYC grant)
  const sellerKey = process.env.SELLER_PRIVATE_KEY;
  const buyerKey  = process.env.BUYER_PRIVATE_KEY;
  if (!sellerKey || !buyerKey) {
    console.error("\u274c SELLER_PRIVATE_KEY and BUYER_PRIVATE_KEY are required.");
    process.exit(1);
  }
  const sellerWallet = new ethers.Wallet(sellerKey, provider);
  const buyerWallet  = new ethers.Wallet(buyerKey, provider);

  console.log(`Admin:  ${adminWallet.address}`);
  console.log(`Seller: ${sellerWallet.address}`);
  console.log(`Buyer:  ${buyerWallet.address}`);
  console.log(`\nUsing ATS Factory: ${ATS_FACTORY_ADDRESS}`);
  console.log(`Using ATS Resolver: ${ATS_RESOLVER_ADDRESS}\n`);

  // ── 1. Deploy the ATS equity token via the real factory ─────────────────
  const factory = new ethers.Contract(ATS_FACTORY_ADDRESS, FACTORY_ABI, adminWallet);

  const ZERO_BYTES32 = ethers.ZeroHash;

  const equityData = {
    security: {
      arePartitionsProtected: false,   // default partition — required for IERC20 transferFrom
      isMultiPartition: false,
      resolver: ATS_RESOLVER_ADDRESS,
      resolverProxyConfiguration: {
        key: ZERO_BYTES32,
        version: 0n,
      },
      rbacs: [],
      isControllable: false,
      isWhiteList: false,
      maxSupply: 10_000_000n,           // 10M max supply (0 decimals)
      erc20MetadataInfo: {
        name:     "DvP Demo Equity Token",
        symbol:   "DVPE",
        isin:     "US0000000DPV",
        decimals: 0,
      },
      clearingActive:       false,
      internalKycActivated: true,       // KYC enforced — this is the key ATS feature
      externalPauses:       [],
      externalControlLists: [],
      externalKycLists:     [],
      erc20VotesActivated:  false,
      compliance:           ethers.ZeroAddress,
      identityRegistry:     ethers.ZeroAddress,
    },
    equityDetails: {
      votingRight:          true,
      informationRight:     true,
      liquidationRight:     true,
      subscriptionRight:    false,
      conversionRight:      false,
      redemptionRight:      false,
      putRight:             false,
      dividendRight:        0,          // NONE = 0
      currency:             ethers.toUtf8Bytes("USD").slice(0, 3).reduce(
        (acc, b, i) => acc | (BigInt(b) << BigInt(8 * (2 - i))),
        0n
      ),
      nominalValue:         100n,       // $1.00 nominal (2 decimals)
      nominalValueDecimals: 2,
    },
  };

  // currency as bytes3: "USD"
  const usdBytes3 = "0x555344"; // "USD" in hex

  const equityDataWithCurrency = {
    ...equityData,
    equityDetails: {
      ...equityData.equityDetails,
      currency: usdBytes3,
    },
  };

  const regulationData = {
    regulationType:    0, // NONE = 0
    regulationSubType: 0, // NONE = 0
    additionalSecurityData: {
      countriesControlListType: false,
      listOfCountries:          "",
      info:                     "DvP settlement demo token",
    },
  };

  console.log("Deploying ATS equity token via Factory.deployEquity()...");
  console.log("(This calls the real ATS Factory at the official testnet deployment)\n");

  let atsTokenAddress: string;
  try {
    const tx = await factory.deployEquity(
      equityDataWithCurrency,
      regulationData,
      { gasPrice: GAS_PRICE }
    );
    console.log(`Transaction submitted: ${tx.hash}`);
    console.log(`HashScan: https://hashscan.io/testnet/transaction/${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`\u2713 Transaction confirmed in block ${receipt.blockNumber}`);

    // Extract deployed address from return value / event
    // The factory emits a SecurityDeployed event or returns the address
    // Try to decode from return data
    if (receipt && receipt.logs) {
      // Look for a log from the factory with an address
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === ATS_FACTORY_ADDRESS.toLowerCase()) {
          try {
            const iface = new ethers.Interface([
              "event EquityDeployed(address indexed equityAddress)",
              "event SecurityDeployed(address indexed tokenAddress)",
              "event TokenDeployed(address indexed tokenAddress)",
            ]);
            const parsed = iface.parseLog(log);
            if (parsed) {
              atsTokenAddress = (parsed.args[0] as string);
              console.log(`\u2713 ATS equity token deployed via event: ${atsTokenAddress}`);
              break;
            }
          } catch {}
        }
      }
    }

    // If we couldn't get address from events, call static to simulate
    if (!atsTokenAddress!) {
      // Try static call before broadcast to get return value
      console.log("Attempting to retrieve address from transaction response...");
      const response = await provider.call({
        to: ATS_FACTORY_ADDRESS,
        data: factory.interface.encodeFunctionData("deployEquity", [equityDataWithCurrency, regulationData]),
        from: adminWallet.address,
      });
      atsTokenAddress = ethers.AbiCoder.defaultAbiCoder().decode(["address"], response)[0] as string;
      console.log(`\u2713 ATS equity token address from static call: ${atsTokenAddress}`);
    }
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`\n\u274c Factory deployEquity failed: ${msg.slice(0, 200)}`);
    console.error("\nThis can happen if:");
    console.error("  1. The ATS admin account is not registered with the factory");
    console.error("  2. The ISIN format is incorrect");
    console.error("  3. The factory requires additional setup");
    console.error("\nFalling back to MockATSToken for demo purposes...\n");

    // Fallback: deploy MockATSToken so the rest of the scripts can proceed
    const hre = require("hardhat");
    const ethersHre = hre.ethers;
    const [deployer] = await ethersHre.getSigners();
    const artifactPath = path.resolve(__dirname, "../../artifacts/contracts/test/MockATSToken.sol/MockATSToken.json");
    if (!fs.existsSync(artifactPath)) {
      console.error("Artifact not found. Run: npx hardhat compile");
      process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const factoryMock = new ethersHre.ContractFactory(artifact.abi, artifact.bytecode, deployer);
    const token = await factoryMock.deploy("DvP Demo Equity Token", "DVPE", 0);
    await token.waitForDeployment();
    atsTokenAddress = await token.getAddress();
    console.log(`\u2713 MockATSToken deployed as fallback: ${atsTokenAddress}`);
    console.log("  NOTE: This is a simulation — use a real ATS token for production.");

    // Mint to seller
    const mintTx = await token.mint(sellerWallet.address, 1_000_000n);
    await mintTx.wait();
    console.log(`\u2713 Minted 1,000,000 DVPE to seller ${sellerWallet.address}`);

    writeStep("provisionAts", {
      done: true,
      atsTokenAddress,
      usedMockFallback: true,
    });
    console.log(`\nAdd to .env: ATS_TOKEN_ADDRESS=${atsTokenAddress}`);
    return;
  }

  console.log(`\u2713 ATS equity token address: ${atsTokenAddress!}`);
  console.log(`  HashScan: https://hashscan.io/testnet/contract/${atsTokenAddress!}`);

  // ── 2. Grant KYC to seller and buyer ────────────────────────────────────
  const atsToken = new ethers.Contract(atsTokenAddress!, KYC_ABI, adminWallet);

  console.log("\nGranting KYC eligibility to seller and buyer...");
  try {
    const kycSellerTx = await atsToken.grantKyc(sellerWallet.address, { gasPrice: GAS_PRICE });
    await kycSellerTx.wait();
    console.log(`\u2713 KYC granted to seller ${sellerWallet.address}`);

    const kycBuyerTx = await atsToken.grantKyc(buyerWallet.address, { gasPrice: GAS_PRICE });
    await kycBuyerTx.wait();
    console.log(`\u2713 KYC granted to buyer ${buyerWallet.address}`);
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`\u26a0  KYC grant encountered an issue: ${msg.slice(0, 150)}`);
    console.warn("  KYC may need to be granted via the ATS SDK or ATS web UI.");
    console.warn("  Continuing — grant KYC manually before running script 7.");
  }

  // ── 3. Issue tokens to seller ───────────────────────────────────────────
  const atsIssue = new ethers.Contract(atsTokenAddress!, ISSUE_ABI, adminWallet);
  console.log("\nIssuing 1,000,000 DVPE to seller...");
  try {
    const issueTx = await atsIssue.issue(
      sellerWallet.address,
      1_000_000n,
      ethers.toUtf8Bytes("demo issuance"),
      { gasPrice: GAS_PRICE }
    );
    await issueTx.wait();
    const bal = await atsIssue.balanceOf(sellerWallet.address);
    console.log(`\u2713 Issued tokens. Seller balance: ${bal}`);
  } catch (err) {
    const msg = (err as Error).message;
    console.warn(`\u26a0  Issue (mint) failed: ${msg.slice(0, 150)}`);
    console.warn("  Tokens may need to be minted via the ATS SDK or web UI.");
  }

  writeStep("provisionAts", { done: true, atsTokenAddress: atsTokenAddress! });
  console.log(`\n\u2705 ATS equity token provisioned via real ATS Factory.`);
  console.log(`Add to .env: ATS_TOKEN_ADDRESS=${atsTokenAddress!}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
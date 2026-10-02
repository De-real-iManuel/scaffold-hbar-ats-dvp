import * as dotenv from "dotenv";
import * as path from "path";
import { ethers } from "ethers";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const LOOKBACK_BLOCKS = 200;
const GAS_PRICE = 900_000_000_000n;

const DVP_ABI = [
  "event OfferSettled(uint256 indexed offerId, address indexed seller, address indexed buyer, uint256 assetAmount, uint256 paymentAmount)",
];

export interface AuditEventArgs {
  offerId: bigint;
  seller: string;
  buyer: string;
  assetAmount: bigint;
  paymentAmount: bigint;
  txHash: string;
  blockTimestamp: number;
}

/**
 * Build a JSON audit message from an OfferSettled event.
 * Pure function — all bigints serialized as decimal strings.
 */
export function buildAuditMessage(args: AuditEventArgs): string {
  const msg = {
    offerId: args.offerId.toString(),
    seller: args.seller.toLowerCase(),
    buyer: args.buyer.toLowerCase(),
    assetAmount: args.assetAmount.toString(),
    paymentAmount: args.paymentAmount.toString(),
    txHash: args.txHash,
    timestamp: new Date(args.blockTimestamp * 1000).toISOString(),
  };
  return JSON.stringify(msg);
}

async function main() {
  console.log("=== HCS Settlement Audit Trail ===\n");

  const dvpAddress = process.env.DVP_SETTLEMENT_ADDRESS;
  if (!dvpAddress) {
    console.error("DVP_SETTLEMENT_ADDRESS is required. Set it in packages/hardhat/.env after running script 5.");
    process.exit(1);
  }

  const operatorAccountId = process.env.DEPLOYER_ACCOUNT_ID;
  const operatorKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!operatorAccountId || !operatorKey) {
    console.error("DEPLOYER_ACCOUNT_ID and DEPLOYER_PRIVATE_KEY are required.");
    process.exit(1);
  }

  const { Client, TopicCreateTransaction, TopicMessageSubmitTransaction, PrivateKey, Hbar } =
    await import("@hashgraph/sdk");

  const normalizedKey = operatorKey.replace(/^0x/, "");
  const privKey = PrivateKey.fromStringECDSA(normalizedKey);
  const client = Client.forTestnet();
  client.setOperator(operatorAccountId, privKey);

  // Create or reuse HCS topic
  let topicId = process.env.HCS_TOPIC_ID;
  if (!topicId) {
    console.log("No HCS_TOPIC_ID set — creating a new append-only topic...");
    const createTx = await new TopicCreateTransaction()
      .setTopicMemo("scaffold-hbar-ats-dvp settlement audit")
      .setMaxTransactionFee(new Hbar(2))
      .execute(client);
    const createReceipt = await createTx.getReceipt(client);
    topicId = createReceipt.topicId!.toString();
    console.log(`✓ HCS topic created: ${topicId}`);
    console.log(`  HashScan: https://hashscan.io/testnet/topic/${topicId}`);
    console.log(`  Add to .env: HCS_TOPIC_ID=${topicId}\n`);
  } else {
    console.log(`Using existing HCS topic: ${topicId}`);
  }

  // Connect to Hedera EVM via ethers
  const rpcUrl = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(dvpAddress, DVP_ABI, provider);

  // Poll for OfferSettled events in the last LOOKBACK_BLOCKS
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latestBlock - LOOKBACK_BLOCKS);
  console.log(`Scanning blocks ${fromBlock} to ${latestBlock} for OfferSettled events...`);

  let logs: ethers.Log[];
  try {
    logs = await provider.getLogs({
      address: dvpAddress,
      topics: [contract.interface.getEvent("OfferSettled")!.topicHash],
      fromBlock,
      toBlock: latestBlock,
    });
  } catch (err) {
    console.error("Failed to fetch logs:", (err as Error).message);
    process.exit(1);
  }

  if (logs.length === 0) {
    console.log("No OfferSettled events found in lookback window. Nothing to audit.");
    client.close();
    return;
  }

  console.log(`Found ${logs.length} OfferSettled event(s). Submitting HCS audit messages...\n`);

  for (const log of logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (!parsed) continue;

      const block = await provider.getBlock(log.blockNumber);
      const args: AuditEventArgs = {
        offerId: parsed.args.offerId as bigint,
        seller: parsed.args.seller as string,
        buyer: parsed.args.buyer as string,
        assetAmount: parsed.args.assetAmount as bigint,
        paymentAmount: parsed.args.paymentAmount as bigint,
        txHash: log.transactionHash,
        blockTimestamp: block?.timestamp ?? Math.floor(Date.now() / 1000),
      };

      const message = buildAuditMessage(args);
      console.log(`Submitting HCS audit for offer #${args.offerId}...`);

      const submitTx = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message)
        .setMaxTransactionFee(new Hbar(2))
        .execute(client);
      const submitReceipt = await submitTx.getReceipt(client);
      const hcsTxId = submitTx.transactionId.toString();

      console.log(`✓ HCS message submitted for offer #${args.offerId}`);
      console.log(`  HCS tx: ${hcsTxId}`);
      console.log(`  Topic: https://hashscan.io/testnet/topic/${topicId}`);
    } catch (err) {
      console.error(`Failed to submit HCS message for log ${log.transactionHash}:`, (err as Error).message);
      // Continue processing remaining events
    }
  }

  console.log("\n✅ HCS audit complete.");
  client.close();
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
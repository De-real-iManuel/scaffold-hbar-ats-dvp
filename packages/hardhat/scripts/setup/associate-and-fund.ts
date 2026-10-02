import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function main() {
  const { Client, TokenAssociateTransaction, TransferTransaction, PrivateKey, TokenId, AccountId, Hbar } = await import("@hashgraph/sdk");

  const deployerKey  = PrivateKey.fromStringECDSA(process.env.DEPLOYER_PRIVATE_KEY!.replace(/^0x/, ""));
  const buyerKey     = PrivateKey.fromStringECDSA(process.env.BUYER_PRIVATE_KEY!.replace(/^0x/, ""));
  const sellerKey    = PrivateKey.fromStringECDSA(process.env.SELLER_PRIVATE_KEY!.replace(/^0x/, ""));

  const deployerAccount = AccountId.fromString(process.env.DEPLOYER_ACCOUNT_ID!);
  const buyerAccount    = AccountId.fromString(process.env.BUYER_ACCOUNT_ID!);
  const sellerAccount   = AccountId.fromString(process.env.SELLER_ACCOUNT_ID!);
  const tokenId         = TokenId.fromString("0.0.10816685");

  // Client as deployer (treasury)
  const client = Client.forTestnet();
  client.setOperator(deployerAccount, deployerKey);

  // Step 1: Associate token with buyer (signed by buyer)
  console.log("Associating payment token with buyer account", process.env.BUYER_ACCOUNT_ID, "...");
  try {
    const assocTx = await new TokenAssociateTransaction()
      .setAccountId(buyerAccount)
      .setTokenIds([tokenId])
      .freezeWith(client)
      .sign(buyerKey);
    const assocRes = await assocTx.execute(client);
    const assocReceipt = await assocRes.getReceipt(client);
    console.log("✓ Buyer associated with token:", assocReceipt.status.toString());
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("TOKEN_ALREADY_ASSOCIATED")) {
      console.log("✓ Buyer already associated with payment token");
    } else {
      console.error("Associate error:", msg);
    }
  }

  // Step 2: Associate token with seller too (in case needed)
  console.log("Associating payment token with seller account", process.env.SELLER_ACCOUNT_ID, "...");
  try {
    const assocTx2 = await new TokenAssociateTransaction()
      .setAccountId(sellerAccount)
      .setTokenIds([tokenId])
      .freezeWith(client)
      .sign(sellerKey);
    const assocRes2 = await assocTx2.execute(client);
    const assocReceipt2 = await assocRes2.getReceipt(client);
    console.log("✓ Seller associated with token:", assocReceipt2.status.toString());
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("TOKEN_ALREADY_ASSOCIATED")) {
      console.log("✓ Seller already associated with payment token");
    } else {
      console.error("Associate error:", msg);
    }
  }

  // Step 3: Transfer 100 PAY from deployer (treasury) to buyer
  console.log("Transferring 100 PAY tokens to buyer...");
  const transferTx = await new TransferTransaction()
    .addTokenTransfer(tokenId, deployerAccount, -100_000_000) // 100 tokens, 6 decimals
    .addTokenTransfer(tokenId, buyerAccount, 100_000_000)
    .freezeWith(client)
    .sign(deployerKey);
  const transferRes = await transferTx.execute(client);
  const transferReceipt = await transferRes.getReceipt(client);
  console.log("✓ Transfer status:", transferReceipt.status.toString());
  console.log("  HashScan: https://hashscan.io/testnet/transaction/" + transferRes.transactionId.toString());

  console.log("\n✅ Buyer funded with PAY tokens. Ready to run scripts 6 and 7.");
  client.close();
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
# Testnet Setup

Reproducible setup for a Hedera Testnet demonstration of bilateral DvP settlement. All seven scripts are idempotent — re-running skips completed steps. State is persisted in `scripts/setup/setup-state.json`.

---

## Prerequisites

- Node.js >= 20.19.0
- Yarn (via corepack): `corepack enable && corepack prepare yarn@stable --activate`
- Three funded Hedera Testnet accounts: deployer/admin, seller, buyer
- Get testnet HBAR: [https://portal.hedera.com/register](https://portal.hedera.com/register)
- At least 10 HBAR on the deployer account

---

## Required environment variables

Set these in `packages/hardhat/.env` (copy from `.env.example`). Never commit `.env`.

| Variable | Required | Description |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Yes | ECDSA private key (`0x...`) for deployer. Must have HBAR balance. |
| `DEPLOYER_ACCOUNT_ID` | Yes (script 3) | Hedera account ID (`0.0.XXXXX`) for deployer. Required for HTS token creation. |
| `ATS_ADMIN_PRIVATE_KEY` | Yes | Private key for ATS token administrator. |
| `SELLER_PRIVATE_KEY` | Yes | Private key for seller participant. |
| `SELLER_ACCOUNT_ID` | Yes (script 4) | Hedera account ID for seller. |
| `BUYER_PRIVATE_KEY` | Yes | Private key for buyer participant. |
| `BUYER_ACCOUNT_ID` | Yes (script 4) | Hedera account ID for buyer. |
| `ATS_TOKEN_ADDRESS` | Optional | EVM address of an existing ATS token. If set, script 2 skips deployment. |
| `PAYMENT_TOKEN_ADDRESS` | Optional | EVM address of an existing HTS payment token. If set, script 3 skips creation. |
| `HEDERA_RPC_URL` | Optional | Override default `https://testnet.hashio.io/api`. |
| `ATS_FACTORY_ADDRESS` | Optional | ATS factory EVM address, if using a real ATS deployment. |
| `ATS_RESOLVER_ADDRESS` | Optional | ATS resolver EVM address, if using a real ATS deployment. |

---

## Running the setup scripts

Run scripts 1–7 in order from the `packages/hardhat` directory.

### Windows (direct Node invocation — avoids PATH issues)

```bash
cd packages/hardhat

node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/1.validate.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/2.provision-ats.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/3.provision-payment-token.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/4.prepare-participants.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/5.deploy-settlement.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/6.grant-allowances.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/7.run-exchange.ts --network hederaTestnet
```

### Linux / Mac

```bash
cd packages/hardhat

npx hardhat run scripts/setup/1.validate.ts --network hederaTestnet
npx hardhat run scripts/setup/2.provision-ats.ts --network hederaTestnet
npx hardhat run scripts/setup/3.provision-payment-token.ts --network hederaTestnet
npx hardhat run scripts/setup/4.prepare-participants.ts --network hederaTestnet
npx hardhat run scripts/setup/5.deploy-settlement.ts --network hederaTestnet
npx hardhat run scripts/setup/6.grant-allowances.ts --network hederaTestnet
npx hardhat run scripts/setup/7.run-exchange.ts --network hederaTestnet
```

---

## Script-by-script expected output

### Script 1: Validate network and prerequisites

Checks: required env vars present, RPC reachable, chain ID is 296, deployer balance >= 10 HBAR.

```
=== Step 1: Validate Network and Prerequisites ===

Connecting to: https://testnet.hashio.io/api
✓ Connected to Hedera Testnet (chainId 296)
✓ Deployer: 0x...
  Balance: 1000000000 tinybars (10 HBAR)
✓ Deployer balance sufficient

✅ Validation passed. Ready to run setup scripts 2–7.
```

### Script 2: Provision ATS demo asset

Deploys `MockATSToken` on Hedera Testnet EVM as the demo ATS asset, or records an existing address if `ATS_TOKEN_ADDRESS` is set.

```
=== Step 2: Provision ATS Demo Asset ===

Deploying demo ATS token (MockATSToken)...
✓ Demo ATS token deployed: 0x...
  HashScan: https://hashscan.io/testnet/contract/0x...
✓ Minted 1000 DATS to deployer (seller)

✅ ATS demo token provisioned.
Add to .env: ATS_TOKEN_ADDRESS=0x...
```

If `ATS_TOKEN_ADDRESS` is already set:
```
Using manually configured ATS_TOKEN_ADDRESS: 0x...
✅ ATS token address recorded in setup state.
```

### Script 3: Provision HTS payment token

Creates a native HTS fungible token using `@hashgraph/sdk` `TokenCreateTransaction`. Requires `DEPLOYER_ACCOUNT_ID`.

```
=== Step 3: Provision HTS Demo Payment Token ===

Creating HTS fungible payment token...
✓ Payment token created: 0.0.XXXXX
  EVM address: 0x...
  HashScan: https://hashscan.io/testnet/token/0.0.XXXXX

✅ Payment token provisioned successfully.
Add to packages/hardhat/.env: PAYMENT_TOKEN_ADDRESS=0x...
```

### Script 4: Prepare participants

Associates tokens with seller and buyer HTS accounts and grants ATS KYC eligibility to the buyer. For real ATS tokens, the KYC grant requires the ATS admin key and may need to be completed via the ATS web UI or SDK.

```
=== Step 4: Prepare Participants ===

⚠  Token association for HTS native tokens requires Hedera SDK operations.
   This script provides the structure; complete the association
   manually via the Hedera Portal or Hashscan if needed.

⚠  ATS KYC/eligibility grant requires ATS SDK and factory deployment.
   Grant eligibility to buyer via the ATS web UI or SDK.
   ATS docs: https://docs.tokenization-studio.hedera.com/ats/getting-started/quick-start/

✅ Participant preparation step recorded.
```

### Script 5: Deploy DvPSettlement

Deploys `DvPSettlement` with the token addresses from setup state. Writes the deployment to `deployments/hederaTestnet/DvPSettlement.json`.

```
=== Step 5: Deploy DvPSettlement ===

Deployer: 0x...
atsAsset:     0x...
paymentToken: 0x...

Deploying DvPSettlement...
Transaction hash: 0x...
✓ DvPSettlement deployed at: 0x...
  HashScan: https://hashscan.io/testnet/contract/0x...

✅ Deployment complete.
   DVP_SETTLEMENT_ADDRESS=0x...
   NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS=0x...
```

After this step, add both addresses to the respective `.env` files.

### Script 6: Grant allowances

Grants exact ERC-20 allowances from seller (ATS token → DvP) and buyer (payment token → DvP).

```
=== Step 6: Grant Bounded ERC-20 Allowances ===

Seller: 0x...
Buyer:  0x...
DvP:    0x...

Seller ATS balance: 1000.0
Approving ATS from seller...
✓ Seller approved 100.0 ATS to DvP

Buyer payment balance: 50.0
Approving payment tokens from buyer...
✓ Buyer approved 50.0 DVPPAY to DvP

✅ Allowances granted. Ready to run exchange (script 7).
```

### Script 7: Run exchange

Runs two scenarios: a successful settlement and a deliberately rejected attempt (wrong buyer).

```
=== Step 7: Run DvP Exchange ===

SCENARIO 1: Successful DvP Settlement
--------------------------------------

Seller (0x...) creating offer...
✓ Offer created: ID 1

Buyer (0x...) accepting offer 1...
✓ Offer settled!
  Transaction: 0x...
  HashScan: https://hashscan.io/testnet/transaction/0x...

SCENARIO 2: Deliberately Rejected (wrong buyer)
------------------------------------------------
✓ Correctly reverted: unauthorized caller rejected

╔═══════════════════════════════════╗
║ EXCHANGE SUMMARY                  ║
╠═══════════════════════════════════╣
║ Scenario 1 (happy path): ✅ SETTLED ║
║ Scenario 2 (wrong buyer): ✅ REJECTED║
╚═══════════════════════════════════╝

✅ HashScan: https://hashscan.io/testnet/transaction/0x...
```

---

## Testnet evidence

Verified deployment from this repository. Both transfers confirmed in a single transaction. KYC revocation and wrong-buyer rejection verified on-chain.

| Item | Value |
|---|---|
| Network | Hedera Testnet (chainId 296) |
| DvPSettlement | [`0x20308700CcF4a22db4b05E8E4Cc4Ff7c72176D51`](https://hashscan.io/testnet/contract/0x20308700CcF4a22db4b05E8E4Cc4Ff7c72176D51) |
| MockATSToken (demo ATS asset) | [`0xEDdD1903D24E26A84E2AEeFf08909b9D024574E6`](https://hashscan.io/testnet/contract/0xEDdD1903D24E26A84E2AEeFf08909b9D024574E6) |
| HTS payment token (Hedera token ID) | [`0.0.10816685`](https://hashscan.io/testnet/token/0.0.10816685) |
| HTS payment token (EVM address) | `0x0000000000000000000000000000000000a50cad` |
| Successful settlement tx | [`0x317c3c17e80a392bbab7732e6eb8bc21aee0fb797307017c72bd6b249196e02b`](https://hashscan.io/testnet/transaction/0x317c3c17e80a392bbab7732e6eb8bc21aee0fb797307017c72bd6b249196e02b) |
| Settlement result | Seller exchanged 100 DATS → Buyer received; Buyer paid 50 DVPPAY → Seller received. Atomic. |

Verified: seller exchanged 100 DATS for 50 DVPPAY atomically. Both transfers confirmed in a single transaction. KYC revocation and wrong-buyer rejection both verified on-chain.

---

## Local unit tests (no credentials needed)

All 44 tests run against a local Hardhat EVM with mock tokens — no testnet credentials or HBAR required.

```bash
# From repo root
yarn hardhat:test

# From packages/hardhat (Windows)
node node_modules/hardhat/internal/cli/bootstrap.js test

# From packages/hardhat (Linux/Mac)
npx hardhat test
```

---

## After testnet setup: connect the frontend

Once script 5 has run, set these in `packages/nextjs/.env`:

```
NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS=0x...   # from script 5 output
NEXT_PUBLIC_ATS_TOKEN_ADDRESS=0x...        # from script 2 output
NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=0x...    # from script 3 output
NEXT_PUBLIC_WC_PROJECT_ID=                 # optional, for WalletConnect wallets
```

Then:

```bash
yarn next:dev
# Open http://localhost:3000
# The Local Mode banner should be gone if addresses are set correctly.
```

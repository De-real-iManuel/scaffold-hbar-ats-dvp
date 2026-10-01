# Testnet Setup

Reproducible setup for a Hedera Testnet demonstration of bilateral DvP settlement.

## Prerequisites

- Node.js >= 20.18.3
- Yarn (via corepack)
- Three funded Hedera Testnet accounts: deployer/admin, seller, buyer
- Get testnet HBAR: [https://portal.hedera.com/register](https://portal.hedera.com/register)

---

## Required Environment Variables

Set these in `packages/hardhat/.env` (copy from `.env.example`):

| Variable | Description |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | ECDSA private key for deployer/operator account |
| `DEPLOYER_ACCOUNT_ID` | Hedera account ID (0.0.XXXXX) for deployer |
| `ATS_ADMIN_PRIVATE_KEY` | Private key for ATS token administrator |
| `SELLER_PRIVATE_KEY` | Private key for seller participant |
| `SELLER_ACCOUNT_ID` | Hedera account ID for seller |
| `BUYER_PRIVATE_KEY` | Private key for buyer participant |
| `BUYER_ACCOUNT_ID` | Hedera account ID for buyer |
| `ATS_TOKEN_ADDRESS` | EVM address of ATS token (set after script 2) |
| `PAYMENT_TOKEN_ADDRESS` | EVM address of HTS payment token (set after script 3) |
| `ATS_FACTORY_ADDRESS` | ATS factory EVM address (from ATS deployment) |
| `ATS_RESOLVER_ADDRESS` | ATS resolver EVM address (from ATS deployment) |

---

## Running the Setup Scripts

Run scripts 1–7 in order from the `packages/hardhat` directory. Each script is idempotent — re-running skips completed steps.

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

## Script-by-Script Expected Output

### Script 1: Validate Network

```
=== Step 1: Validate Network and Prerequisites ===
Connecting to: https://testnet.hashio.io/api
✓ Connected to Hedera Testnet (chainId 296)
✓ Deployer: 0x...
  Balance: 1000000000 tinybars (10 HBAR)
✓ Deployer balance sufficient
✓ State updated: validate
✅ Validation passed. Ready to run setup scripts 2–7.
```

### Script 2: Provision ATS Asset

Uses the ATS SDK to deploy a demo equity or bond token. Requires ATS factory and resolver addresses in `.env`.

Alternatively, set `ATS_TOKEN_ADDRESS` in `.env` if you have an existing ATS token.

```
=== Step 2: Provision ATS Demo Asset ===
✓ ATS token address recorded in setup state.
```

### Script 3: Provision HTS Payment Token

Creates a standard HTS fungible token. Alternatively, set `PAYMENT_TOKEN_ADDRESS` in `.env`.

```
=== Step 3: Provision HTS Demo Payment Token ===
✓ Payment token created: 0.0.XXXXX
  EVM address: 0x...
  HashScan: https://hashscan.io/testnet/token/0.0.XXXXX
✅ Payment token provisioned successfully.
Add to packages/hardhat/.env: PAYMENT_TOKEN_ADDRESS=0x...
```

### Script 4: Prepare Participants

Associates tokens with participants and grants ATS KYC eligibility to the buyer.

```
=== Step 4: Prepare Participants ===
✓ Seller associated with ATS token
✓ Seller associated with payment token
✓ Buyer associated with ATS token
✓ Buyer associated with payment token
✓ Buyer KYC eligibility granted
✅ Participants ready.
```

### Script 5: Deploy DvPSettlement

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
   Add to packages/hardhat/.env: DVP_SETTLEMENT_ADDRESS=0x...
   Add to packages/nextjs/.env: NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS=0x...
```

### Script 6: Grant Allowances

```
=== Step 6: Grant Bounded ERC-20 Allowances ===
Approving ATS tokens from seller...
✓ Seller approved 100.000000000000000000 ATS → 0x...
Approving payment tokens from buyer...
✓ Buyer approved 50.000000 PAYMT → 0x...
✅ Allowances granted.
```

### Script 7: Run Exchange

```
=== Step 7: Run DvP Exchange ===
SCENARIO 1: Successful DvP Settlement
Seller (0x...) creating offer...
✓ Offer created: ID 1
Buyer (0x...) accepting offer 1...
✓ Offer settled!
  Transaction: 0x...
  HashScan: https://hashscan.io/testnet/transaction/0x...

SCENARIO 2: Deliberately Rejected Exchange (wrong buyer)
Offer 2 created for buyer: 0x...
Stranger (0x...) attempting to accept...
✓ Transaction correctly reverted: unauthorized caller rejected

╔══════════════════════════════════════════════════╗
║          EXCHANGE SUMMARY                        ║
╠══════════════════════════════════════════════════╣
║ Scenario 1 (happy path):    ✅ SETTLED            ║
║ Scenario 2 (wrong buyer):   ✅ REJECTED           ║
╚══════════════════════════════════════════════════╝
```

---

## Testnet Evidence

> To be populated after running scripts with funded accounts.

| Item | Value |
|---|---|
| DvPSettlement address | `pending` |
| ATS token address | `pending` |
| HTS payment token | `pending` |
| Successful settlement tx | `pending` |
| HashScan link | `pending` |

---

## Local Unit Tests (no credentials needed)

All 44 tests run against a local Hardhat EVM with mock tokens — no testnet credentials or HBAR required.

```bash
# From repo root
yarn hardhat:test

# Or directly from packages/hardhat (Windows)
node node_modules/hardhat/internal/cli/bootstrap.js test

# Or directly from packages/hardhat (Linux/Mac)
npx hardhat test
```

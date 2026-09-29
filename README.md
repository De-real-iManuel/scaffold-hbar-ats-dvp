# scaffold-hbar-ats-dvp

A Scaffold-HBAR starter template demonstrating bilateral **delivery-versus-payment (DvP)** settlement on Hedera: a seller atomically exchanges a permissioned **ATS (Asset Tokenization Studio)** security token for an **HTS (Hedera Token Service)** payment token in a single on-chain transaction.

**Who should use this:** Developers adding permissioned-asset purchases to an existing application on Hedera.

---

## Exact Supported Configuration

This template supports one specific, documented token configuration:

| Token | Type | Interface | Requirements |
|---|---|---|---|
| ATS asset | ERC-20-compatible smart contract | IERC20 via allowance | KYC enabled, no protected partitions, not paused |
| Payment token | Native HTS fungible token | IERC20 via HTS precompile | No custom fees, no rebasing |

**Unsupported:** ATS tokens with protected partitions, globally paused/frozen tokens, tokens with custom HTS fees, rebasing tokens.

ATS tokens are ERC-20-compatible smart contracts on Hedera EVM. They are **not** the same as native HTS tokens — see [Why ATS and HTS](#why-ats-and-hts-are-essential) below.

---

## Quick Start

```bash
# 1. Install dependencies (requires Node.js >= 20.18.3 and Yarn)
corepack enable && corepack prepare yarn@stable --activate
yarn install

# 2. Run unit tests (local Hardhat EVM — no testnet credentials needed)
yarn hardhat:test

# Expected output:
#   DvPSettlement
#     Constructor
#       ✓ reverts when atsAsset is the zero address
#       ✓ reverts when paymentToken is the zero address
#       ...
#     40+ passing tests

# 3. Build the Next.js frontend (local mode — no env vars needed)
yarn next:build

# Expected output: ✓ Compiled successfully

# 4. Start the frontend in development mode
yarn next:dev
# Open http://localhost:3000
# A yellow banner shows: ⚠ Local Mode — all data is mock/test data
```

For testnet deployment and a real DvP exchange, see [docs/testnet.md](docs/testnet.md).

---

## Seller-to-Buyer DvP Walkthrough

This walkthrough describes one complete delivery-versus-payment cycle.

### Prerequisites

- Both participants have Hedera Testnet accounts with HBAR.
- An ATS token has been provisioned (script 2) and the buyer has KYC eligibility granted (script 4).
- An HTS payment token has been provisioned (script 3) and both accounts are associated.
- `DvPSettlement` is deployed (script 5).

### Step 1 — Seller grants ATS allowance

The seller approves `DvPSettlement` to transfer exactly `assetAmount` of their ATS tokens:

```
atsToken.approve(dvpAddress, assetAmount)    # seller signs
```

**Important:** This approval does not lock or reserve tokens. Multiple open offers from the same seller may conflict.

### Step 2 — Seller creates an offer

The seller calls `createOffer(buyer, assetAmount, paymentAmount, expiry)`. The contract records the offer on-chain and emits `OfferCreated(offerId, ...)`. The seller shares the `offerId` with the buyer.

### Step 3 — Buyer reviews the offer

The buyer looks up the offer by ID and sees: seller, asset amount, payment amount required, expiry, and current status. The frontend shows advisory preflight checks (payment balance, allowance, ATS eligibility).

### Step 4 — Buyer grants payment allowance

The buyer approves `DvPSettlement` to transfer exactly `paymentAmount` of the payment token:

```
paymentToken.approve(dvpAddress, paymentAmount)    # buyer signs
```

### Step 5 — Buyer accepts the offer

The buyer calls `acceptOffer(offerId)`. The contract:

1. Validates caller is the designated buyer, offer is Open, and not expired.
2. Sets offer status to `Filled` (CEI pattern — before any external call).
3. Calls `paymentToken.transferFrom(buyer, seller, paymentAmount)` — requires `true`.
4. Calls `atsAsset.transferFrom(seller, buyer, assetAmount)` — requires `true`. ATS token enforces KYC on buyer here.
5. Emits `OfferSettled(offerId, seller, buyer, assetAmount, paymentAmount)`.

If step 3 or 4 fails for any reason (KYC revoked, paused token, insufficient balance), the EVM reverts the entire transaction and neither party loses tokens.

### Step 6 — Confirm settlement

Both participants can verify the `OfferSettled` event on [HashScan](https://hashscan.io/testnet). Token balances update atomically.

---

## Why ATS and HTS Are Essential

### ATS tokens — permissioned security token infrastructure

The [Hashgraph Asset Tokenization Studio](https://docs.hedera.com/hedera/open-source-solutions/asset-tokenization-studio-ats) provides ERC-1400-compatible security tokens with:
- **KYC/eligibility enforcement** at the smart contract level: `transferFrom` reverts if the buyer is not eligible.
- **Compliance controls**: pause, freeze, transfer restrictions enforced on-chain.
- **Regulatory compliance**: supports ERC-3643 (T-REX) partial compatibility.

Without ATS, you would need to build eligibility enforcement yourself, creating legal and technical risk. The DvP settlement pattern only works for permissioned assets if the token itself enforces those permissions at the transfer level.

### HTS payment tokens — native Hedera settlement asset

The [Hedera Token Service](https://docs.hedera.com/hedera/sdks-and-apis/hedera-api/token-service) provides native fungible tokens with:
- **Atomic finality**: HTS transfers finalize in ~3 seconds with guaranteed ordering.
- **No miner extractable value**: Hedera's aBFT consensus eliminates front-running risk in settlement.
- **Low fixed fees**: HTS transfers cost fractions of a cent, predictably.

By combining ATS (for the permissioned asset) with HTS (for the payment token), this template achieves compliant, atomic settlement with Hedera's native infrastructure.

---

## Testnet Evidence

> **Note:** Testnet evidence (contract addresses, transaction hashes, HashScan links) will be added after running the setup scripts with funded accounts. Run `yarn ts-node packages/hardhat/scripts/setup/7.run-exchange.ts` after completing setup.

Placeholder for testnet evidence:
- DvPSettlement contract: `[to be filled]`
- Successful settlement tx: `[to be filled]`
- HashScan link: `[to be filled]`

---

## Links

- [Architecture](docs/architecture.md) — Mermaid diagram, trust boundaries, rollback behavior
- [Testnet Setup](docs/testnet.md) — Reproducible setup commands and expected outputs
- [Extending the Template](docs/extending.md) — Connect different token pairs, replace the UI
- [AGENTS.md](AGENTS.md) — Commands and invariants for AI-assisted development
- [ATS Documentation](https://docs.hedera.com/hedera/open-source-solutions/asset-tokenization-studio-ats)
- [Scaffold-HBAR Docs](https://docs.hedera.com/solutions/tools/scaffold-hbar)
- [HashScan Explorer](https://hashscan.io/testnet)

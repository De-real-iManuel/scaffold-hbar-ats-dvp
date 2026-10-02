# scaffold-hbar-ats-dvp

> Atomic delivery-versus-payment for permissioned ATS security tokens on Hedera â€” the missing settlement primitive for compliant secondary markets.

**Who this is for:** Developers adding permissioned-asset secondary-market settlement to an existing Hedera application.

---

## What it solves

Most token-transfer templates hand you a single `transferFrom`. That's fine for simple swaps, but secondary-market settlement for regulated securities requires more:

- **Atomicity** â€” buyer pays if and only if seller delivers. No partial fills. No stuck funds.
- **Permissioned assets** â€” KYC/eligibility is enforced by the ATS token itself at transfer time, not by an off-chain gate you have to maintain.
- **No escrow** â€” tokens never sit in the settlement contract. One transaction, two transfers, done.

`DvPSettlement` is that primitive: a non-upgradeable smart contract that atomically swaps an ATS security token for an HTS payment token in a single EVM transaction. If either leg fails for any reason (KYC revoked, paused token, insufficient balance, expired offer), the entire transaction reverts and neither party loses anything.

---

## Why you need both ATS and HTS

| Token | Type | Role |
|---|---|---|
| ATS asset | ERC-20-compatible smart contract | Permissioned security token â€” KYC enforced at `transferFrom` |
| Payment token | Native HTS fungible token | Settlement currency â€” atomic finality, fixed fees, no MEV |

**ATS (Asset Tokenization Studio)** provides ERC-1400-compatible security tokens where `transferFrom` reverts if the buyer lacks eligibility. You get on-chain compliance without building a separate eligibility check.

**HTS (Hedera Token Service)** provides native tokens with ~3-second finality, predictable sub-cent fees, and no miner-extractable value. This is what makes Hedera useful for settlement â€” not just token issuance.

Combining them gives you the only pattern that is both compliant (ATS enforces KYC) and final (HTS settles in seconds).

**Unsupported:** ATS tokens with protected partitions, globally paused/frozen tokens, HTS tokens with custom fees, rebasing tokens.

---

## Quick start (local mode â€” no credentials needed)

```bash
# Requires Node.js >= 20.18.3 and Yarn
corepack enable && corepack prepare yarn@stable --activate
yarn install

# Run all 44 unit tests against a local Hardhat EVM
yarn hardhat:test

# Expected:
#   DvPSettlement
#     Constructor ........ 4 passing
#     createOffer ........ 8 passing
#     cancelOffer ........ 5 passing
#     acceptOffer ........ 19 passing
#     Reentrancy ......... 1 passing
#     False-Return Token . 2 passing
#   44 passing (7s)

# Build and start the Next.js frontend in local (mock) mode
yarn next:build
yarn next:dev
# Open http://localhost:3000
# Yellow banner: âš  Local Mode â€” all data is mock/test data
```

---

## Testnet setup (real settlement)

See [docs/testnet.md](docs/testnet.md) for the full walkthrough. The short version:

1. Get three funded Hedera Testnet accounts from [portal.hedera.com](https://portal.hedera.com/register).
2. Fill in `packages/hardhat/.env` (copy from `.env.example`).
3. Run the seven setup scripts in order:

```bash
# From packages/hardhat â€” Windows
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/1.validate.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/2.provision-ats.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/3.provision-payment-token.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/4.prepare-participants.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/5.deploy-settlement.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/6.grant-allowances.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/7.run-exchange.ts --network hederaTestnet
```

```bash
# From packages/hardhat â€” Linux/Mac
npx hardhat run scripts/setup/1.validate.ts --network hederaTestnet
# ... repeat for scripts 2â€“7
```

Each script is idempotent â€” re-running skips completed steps.

---

## Seller â†’ Buyer walkthrough

**Prerequisites:** ATS token provisioned (script 2), buyer has KYC eligibility (script 4), HTS payment token provisioned (script 3), `DvPSettlement` deployed (script 5).

**Step 1 â€” Seller grants ATS allowance**

```solidity
atsToken.approve(dvpAddress, assetAmount)   // seller signs
```

This records an allowance but does not lock or reserve tokens.

**Step 2 â€” Seller creates an offer**

```solidity
dvp.createOffer(buyerAddress, assetAmount, paymentAmount, expiry)
// emits OfferCreated(offerId, ...)
```

The seller shares the `offerId` with the buyer.

**Step 3 â€” Buyer grants payment allowance**

```solidity
paymentToken.approve(dvpAddress, paymentAmount)   // buyer signs
```

**Step 4 â€” Buyer accepts the offer**

```solidity
dvp.acceptOffer(offerId)   // buyer signs
```

The contract atomically:
1. Validates caller is the designated buyer, offer is Open, and not expired.
2. Sets status to `Filled` (CEI pattern â€” before any external call).
3. Calls `paymentToken.transferFrom(buyer, seller, paymentAmount)` â€” requires `true`.
4. Calls `atsAsset.transferFrom(seller, buyer, assetAmount)` â€” ATS enforces KYC here, requires `true`.
5. Emits `OfferSettled(offerId, seller, buyer, assetAmount, paymentAmount)`.

If either transfer fails, the entire transaction reverts. No tokens move.

**Step 5 â€” Confirm on HashScan**

Both participants verify the `OfferSettled` event on [HashScan](https://hashscan.io/testnet). Balances update atomically.

---

## Supported configuration

| Token | Type | Interface | Requirements |
|---|---|---|---|
| ATS asset | ERC-20-compatible smart contract | `IERC20` via allowance | KYC enabled, no protected partitions, not paused |
| Payment token | Native HTS fungible token | `IERC20` via HTS precompile | No custom fees, no rebasing |

ATS tokens are smart contracts on Hedera EVM â€” not the same as native HTS tokens.

---

## Testnet evidence

| Item | Value |
|---|---|
| DvPSettlement contract | [`0x20308700CcF4a22db4b05E8E4Cc4Ff7c72176D51`](https://hashscan.io/testnet/contract/0x20308700CcF4a22db4b05E8E4Cc4Ff7c72176D51) |
| ATS demo token (MockATSToken) | [`0xEDdD1903D24E26A84E2AEeFf08909b9D024574E6`](https://hashscan.io/testnet/contract/0xEDdD1903D24E26A84E2AEeFf08909b9D024574E6) |
| HTS payment token | [`0.0.10816685`](https://hashscan.io/testnet/token/0.0.10816685) |
| Successful settlement tx | [`0x317c3c17e80a392bbab7732e6eb8bc21aee0fb797307017c72bd6b249196e02b`](https://hashscan.io/testnet/transaction/0x317c3c17e80a392bbab7732e6eb8bc21aee0fb797307017c72bd6b249196e02b) |

Verified: seller exchanged 100 DATS for 50 DVPPAY atomically. Both transfers confirmed in a single transaction. KYC revocation and wrong-buyer rejection both verified on-chain.

## Links

- [Architecture](docs/architecture.md) â€” Mermaid sequence diagram, trust boundaries, rollback behavior
- [Testnet setup](docs/testnet.md) â€” Exact commands and expected outputs for all 7 scripts
- [Extending](docs/extending.md) â€” Connect different token pairs, replace the frontend
- [AGENTS.md](AGENTS.md) â€” Commands and invariants for AI-assisted development
- [ATS Documentation](https://docs.hedera.com/hedera/open-source-solutions/asset-tokenization-studio-ats)
- [Scaffold-HBAR Docs](https://docs.hedera.com/solutions/tools/scaffold-hbar)
- [HashScan Explorer](https://hashscan.io/testnet)

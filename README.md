# scaffold-hbar-ats-dvp

> Atomic delivery-versus-payment for permissioned ATS security tokens on Hedera.

One transaction. Two transfers. Either both succeed or neither does. KYC enforced by the asset itself.

[![CI](https://github.com/De-real-iManuel/scaffold-hbar-ats-dvp/actions/workflows/ci.yml/badge.svg)](https://github.com/De-real-iManuel/scaffold-hbar-ats-dvp/actions/workflows/ci.yml)

---

## What this is

A [Scaffold-HBAR](https://docs.hedera.com/solutions/tools/scaffold-hbar) template for bilateral settlement of a permissioned ATS security token against an HTS payment token. The core is `DvPSettlement.sol` — a non-upgradeable smart contract that atomically swaps two IERC20-compatible tokens in a single EVM transaction.

**Who it is for:** Developers adding compliant secondary-market settlement to a Hedera application.

**Scaffold it in one command:**
```bash
npm create scaffold-hbar@latest -- --template De-real-iManuel/scaffold-hbar-ats-dvp
```

---

## Packages

| Package | Description |
|---|---|
| `packages/hardhat` | Solidity contracts, 44-test suite, hardhat-deploy, 7 testnet setup scripts |
| `packages/nextjs` | Next.js 15 frontend — wagmi v2, RainbowKit, Pyth oracle, Hedera Testnet |

---

## Prerequisites

- Node.js >= 20.19.0 (see `.nvmrc`)
- Yarn via corepack: `corepack enable`

---

## Quick start

```bash
# Install
corepack enable
git clone https://github.com/De-real-iManuel/scaffold-hbar-ats-dvp
cd scaffold-hbar-ats-dvp
yarn install

# Run contract tests (no credentials needed)
yarn hardhat:test
# → 44 passing

# Start frontend in local mode (no env vars needed)
yarn next:dev
# → http://localhost:3000  (yellow "Local Mode" banner)
```

---

## Root scripts

```bash
yarn hardhat:test      # Run Hardhat test suite
yarn hardhat:compile   # Compile Solidity
yarn next:build        # Next.js production build (local mode)
yarn next:dev          # Start Next.js dev server
yarn lint              # ESLint across all packages
yarn typecheck         # tsc --noEmit across all packages
```

---

## Project structure

```
scaffold-hbar-ats-dvp/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── DvPSettlement.sol          # Production contract
│   │   │   └── test/                      # Mock contracts for testing only
│   │   ├── deploy/
│   │   │   └── 00_deploy_dvp_settlement.ts
│   │   ├── scripts/
│   │   │   ├── hcs-audit.ts               # HCS audit trail observer
│   │   │   └── setup/                     # Numbered testnet setup scripts 1–7
│   │   ├── test/
│   │   │   └── DvPSettlement.test.ts      # 44 unit tests
│   │   └── hardhat.config.ts
│   └── nextjs/
│       ├── app/                           # Next.js App Router pages
│       ├── components/                    # React UI components
│       ├── hooks/                         # wagmi hooks + Pyth oracle hook
│       └── lib/                           # wagmiConfig, formatters, contracts
├── docs/
│   ├── architecture.md                    # Sequence diagram, trust model, rollback
│   ├── testnet.md                         # Step-by-step testnet walkthrough
│   └── extending.md                       # Swap token pairs, replace frontend
├── .github/workflows/ci.yml
├── template.json                          # create-scaffold-hbar manifest
├── package.json                           # Yarn workspace root
└── AGENTS.md                              # AI agent context
```

---

## How DvP settlement works

```
Seller                         DvPSettlement               Buyer
  │                                  │                        │
  ├─ atsToken.approve(dvp, amt) ────▶│                        │
  ├─ createOffer(buyer, ...) ────────▶│                        │
  │                                  │◀── payToken.approve ───┤
  │                                  │◀── acceptOffer ────────┤
  │                                  │
  │         [CHECKS] caller==buyer, status==Open, not expired
  │         [EFFECTS] status = Filled  ← before any transfer
  │         [INTERACT] payToken.transferFrom(buyer→seller)
  │         [INTERACT] atsToken.transferFrom(seller→buyer)
  │                                  │   ↑ ATS enforces KYC here
  │                                  │
  │         emit OfferSettled ───────▶ both legs confirmed
```

If either transfer fails for any reason, the entire transaction reverts. No partial fills. No stuck funds.

---

## Hedera services used

| Service | Role |
|---|---|
| **HTS** (Hedera Token Service) | Payment token — native HTS fungible token accessed via EVM precompile at `0x...0167` |
| **ATS** (Asset Tokenization Studio) | Asset token — ERC-20-compatible security token with on-chain KYC enforcement |
| **Pyth Network oracle** | Advisory price feed — `useOraclePrice` fetches HBAR/USD from Hermes REST API and suggests a payment amount in the seller form |
| **HCS** (Hedera Consensus Service) | Audit trail — `scripts/hcs-audit.ts` writes tamper-evident settlement records to an append-only topic |

---

## Environment variables

### `packages/hardhat/.env`
Copy `.env.example`. Never commit `.env`.

```
DEPLOYER_PRIVATE_KEY=0x...      # ECDSA key, must have HBAR balance
DEPLOYER_ACCOUNT_ID=0.0.XXXXX   # For HTS operations
ATS_ADMIN_PRIVATE_KEY=0x...     # Grants KYC eligibility
SELLER_PRIVATE_KEY=0x...
SELLER_ACCOUNT_ID=0.0.XXXXX
BUYER_PRIVATE_KEY=0x...
BUYER_ACCOUNT_ID=0.0.XXXXX
ATS_TOKEN_ADDRESS=              # Set after script 2
PAYMENT_TOKEN_ADDRESS=          # Set after script 3
DVP_SETTLEMENT_ADDRESS=         # Set after script 5
HCS_TOPIC_ID=                   # Set after first hcs-audit run
```

### `packages/nextjs/.env`
```
NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS=    # Leave empty for local mode
NEXT_PUBLIC_ATS_TOKEN_ADDRESS=
NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=
NEXT_PUBLIC_WC_PROJECT_ID=             # WalletConnect (optional for MetaMask)
NEXT_PUBLIC_PYTH_FEED_ID=              # Default: HBAR/USD
NEXT_PUBLIC_PYTH_API_KEY=              # From pythdata.app/signup
```

---

## Testnet setup

Full walkthrough: [docs/testnet.md](docs/testnet.md)

Get funded testnet accounts from [portal.hedera.com](https://portal.hedera.com/register), fill in `.env`, then run the 7 setup scripts in order. Each is idempotent.

```bash
cd packages/hardhat

# Linux / Mac
npx hardhat run scripts/setup/1.validate.ts --network hederaTestnet
npx hardhat run scripts/setup/2.provision-ats.ts --network hederaTestnet
npx hardhat run scripts/setup/3.provision-payment-token.ts --network hederaTestnet
npx hardhat run scripts/setup/4.prepare-participants.ts --network hederaTestnet
npx hardhat run scripts/setup/5.deploy-settlement.ts --network hederaTestnet
npx hardhat run scripts/setup/6.grant-allowances.ts --network hederaTestnet
npx hardhat run scripts/setup/7.run-exchange.ts --network hederaTestnet

# Windows (direct bootstrap invocation)
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/1.validate.ts --network hederaTestnet
# ... repeat for scripts 2–7
```

After a successful run of script 7, run the HCS audit:
```bash
npx hardhat run scripts/hcs-audit.ts --network hederaTestnet
```

---

## Testnet evidence

| Item | Value |
|---|---|
| DvPSettlement | [`0x20308700CcF4a22db4b05E8E4Cc4Ff7c72176D51`](https://hashscan.io/testnet/contract/0x20308700CcF4a22db4b05E8E4Cc4Ff7c72176D51) |
| ATS demo token | [`0xEDdD1903D24E26A84E2AEeFf08909b9D024574E6`](https://hashscan.io/testnet/contract/0xEDdD1903D24E26A84E2AEeFf08909b9D024574E6) |
| HTS payment token | [`0.0.10816685`](https://hashscan.io/testnet/token/0.0.10816685) |
| Settlement tx | [`0x317c3c17...e02b`](https://hashscan.io/testnet/transaction/0x317c3c17e80a392bbab7732e6eb8bc21aee0fb797307017c72bd6b249196e02b) |

Verified: seller exchanged 100 DATS for 50 DVPPAY atomically on Hedera Testnet.

---

## Supported configuration

| Token leg | Supported | Not supported |
|---|---|---|
| Asset | ATS token, default partition, KYC enabled | Protected partitions, globally paused tokens |
| Payment | Standard HTS fungible, no custom fees | Rebasing tokens, tokens with custom fees |

To use a different token pair, deploy a new `DvPSettlement` with your addresses. The contract code does not change. See [docs/extending.md](docs/extending.md).

---

## Docs

- [Architecture](docs/architecture.md) — sequence diagram, CEI pattern, trust model, rollback
- [Testnet setup](docs/testnet.md) — script-by-script walkthrough with expected output
- [Extending](docs/extending.md) — swap tokens, replace frontend, upgrade to real ATS
- [AGENTS.md](AGENTS.md) — commands and invariants for AI-assisted development

---

## License

MIT — see [LICENSE](LICENSE).
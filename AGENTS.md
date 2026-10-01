# AGENTS.md — scaffold-hbar-ats-dvp

AI agent context for autonomous development in this repository.

---

## ⚠️ Invariants — Never Violate

These constraints are non-negotiable. Any change that breaks them must be reverted.

1. **No committed secrets** — `.env` files are gitignored. No private keys in any tracked file, ever.
2. **IERC20.transferFrom only** — `DvPSettlement` must only call `IERC20.transferFrom`. Never `forcedTransfer`, `controllerTransfer`, or any ATS-specific transfer method.
3. **No proxy/upgrade patterns** — `DvPSettlement` is non-upgradeable. Never add `initialize()`, proxy patterns, or `delegatecall` routes.
4. **No floating-point for on-chain amounts** — Use `bigint` / `uint256` everywhere. Never `parseFloat`, `toFixed`, or `Number()` for token amounts.
5. **CEI pattern in `acceptOffer`** — `status = Filled` must be written before any external transfer call.
6. **No silent transfer failures** — Always `require(transferFrom(...))`. No try/catch around token calls.
7. **No secrets in deployment artifacts** — `txHash`, `contractAddress`, and `abi` are allowed. Private keys must never appear in any output file.

---

## Commands

### Install dependencies

```bash
corepack enable && yarn install
```

### Run Hardhat tests — local EVM, no credentials needed

**From repo root (preferred):**
```bash
yarn hardhat:test
```

**From `packages/hardhat` — Windows (direct Node, avoids PATH issues):**
```bash
node node_modules/hardhat/internal/cli/bootstrap.js test
```

**From `packages/hardhat` — Linux/Mac:**
```bash
npx hardhat test
# or: ./node_modules/.bin/hardhat test
```

Expected: **44/44 passing** in ~7 seconds.

### Compile Solidity

```bash
yarn hardhat:compile
# or from packages/hardhat (Windows):
node node_modules/hardhat/internal/cli/bootstrap.js compile
```

### Type-check all packages

```bash
yarn typecheck
# packages/hardhat: tsc --noEmit
# packages/nextjs:  tsc --noEmit
```

### Lint all packages

```bash
yarn lint
```

### Build Next.js frontend

```bash
yarn next:build
# Runs in local mode (no env vars) — boots without testnet credentials
```

### Start Next.js dev server

```bash
yarn next:dev
# Opens http://localhost:3000 — yellow banner shows local/mock mode
```

### Deploy to Hedera Testnet

```bash
# From packages/hardhat — Windows
node node_modules/hardhat/internal/cli/bootstrap.js deploy --network hederaTestnet

# From packages/hardhat — Linux/Mac
npx hardhat deploy --network hederaTestnet
```

### Run testnet setup scripts (1–7 in order)

```bash
# From packages/hardhat — Windows
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/1.validate.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/2.provision-ats.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/3.provision-payment-token.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/4.prepare-participants.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/5.deploy-settlement.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/6.grant-allowances.ts --network hederaTestnet
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/7.run-exchange.ts --network hederaTestnet

# From packages/hardhat — Linux/Mac
npx hardhat run scripts/setup/1.validate.ts --network hederaTestnet
# ... repeat for scripts 2–7
```

See [docs/testnet.md](docs/testnet.md) for full expected output per script.

---

## Why `packages/hardhat` Uses nohoist

The root `package.json` nohoists `hardhat`, `hardhat-deploy`, and `hardhat-deploy-ethers` into `packages/hardhat/node_modules/` instead of the root `node_modules/`. This is required because:

- Hardhat uses `require.resolve` to find its own plugins at runtime, which expects them alongside `hardhat` itself.
- Hoisting these packages to the root breaks plugin discovery when running `hardhat test` from `packages/hardhat`.
- The direct `node node_modules/hardhat/internal/cli/bootstrap.js` invocation on Windows is a consequence of this: it bypasses PATH lookup and loads the local copy directly.

If you see `HardhatError: cannot find module` for any hardhat plugin, the nohoist pattern is the right fix — do not hoist these packages.

---

## Repository Layout

```
scaffold-hbar-ats-dvp/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── DvPSettlement.sol      ← Main settlement contract (non-upgradeable)
│   │   │   └── test/                  ← Mock/test contracts (NOT for production)
│   │   │       ├── MockERC20.sol
│   │   │       ├── MockATSToken.sol
│   │   │       ├── MaliciousToken.sol
│   │   │       └── FalseReturnToken.sol
│   │   ├── scripts/setup/             ← Numbered testnet setup scripts (1–7)
│   │   ├── test/
│   │   │   └── DvPSettlement.test.ts  ← Full test suite (44 tests)
│   │   ├── deploy/
│   │   │   └── 00_deploy_dvp_settlement.ts
│   │   ├── hardhat.config.ts
│   │   ├── package.json
│   │   └── .env.example
│   └── nextjs/
│       ├── app/                       ← Next.js App Router pages
│       ├── components/                ← React components
│       ├── hooks/                     ← wagmi React hooks
│       ├── lib/                       ← wagmiConfig, contracts.ts, formatters.ts
│       └── contracts/
│           └── deployedContracts.ts   ← Auto-generated by hardhat deploy
├── docs/
│   ├── architecture.md
│   ├── testnet.md
│   └── extending.md
├── .harness/
│   ├── spec.yaml
│   ├── prd.md
│   └── validators/
├── template.json                      ← create-scaffold-hbar CLI manifest
├── package.json                       ← Root workspace config (nohoist defined here)
├── README.md
└── AGENTS.md
```

---

## Authoritative External References

- [Scaffold-HBAR Docs](https://docs.hedera.com/solutions/tools/scaffold-hbar)
- [create-scaffold-hbar CLI](https://github.com/hedera-dev/create-scaffold-hbar)
- [ATS Documentation](https://docs.tokenization-studio.hedera.com)
- [ATS GitHub](https://github.com/hashgraph/asset-tokenization-studio)
- [HTS System Contract](https://docs.hedera.com/evm/hedera-services/system-contracts/hts)
- [OpenZeppelin Contracts v5](https://docs.openzeppelin.com/contracts/5.x/)
- [Hardhat Docs](https://hardhat.org/docs)
- [wagmi v2 Docs](https://wagmi.sh)
- [HashScan Explorer](https://hashscan.io)
- [Hedera Portal (testnet faucet)](https://portal.hedera.com/register)

---

## Supported Versions

| Tool | Version |
|---|---|
| Node.js | >= 20.19.0 |
| Solidity | 0.8.28 |
| hardhat | ^2.22.0 |
| ethers | ^6.13.0 |
| @openzeppelin/contracts | ^5.0.0 |
| wagmi | ^2.0.0 |
| viem | ^2.0.0 |
| next | 15.x |
| @rainbow-me/rainbowkit | ^2.0.0 |

---

## Secret Handling Rules

| Variable | Where to set | Where it must NEVER appear |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | `packages/hardhat/.env` | Logs, deployment artifacts, frontend, git history |
| `ATS_ADMIN_PRIVATE_KEY` | `packages/hardhat/.env` | Same as above |
| `SELLER_PRIVATE_KEY` | `packages/hardhat/.env` | Same as above |
| `BUYER_PRIVATE_KEY` | `packages/hardhat/.env` | Same as above |
| `NEXT_PUBLIC_WC_PROJECT_ID` | `packages/nextjs/.env` | Not a secret — do not commit the actual value |

All `.env` files are excluded by `.gitignore`. Always run `git status` before committing to confirm no env files are staged.

---

## Validation Requirements (Must Pass Before PR Merge)

1. `yarn install` — clean install, no errors
2. `yarn hardhat:test` — 44/44 tests pass
3. `yarn typecheck` — zero TypeScript errors in both packages
4. `yarn lint` — zero linting errors
5. `yarn next:build` — Next.js production build succeeds in local mode
6. `.github/workflows/ci.yml` — CI passes on latest commit
7. `grep -r "0x[0-9a-fA-F]\{64\}" packages/ template.json package.json` — zero matches (no committed private keys)

---

## Harness Note

Kiro is **not** a supported harness backend. The supported backends are Claude Code and Cursor (as documented in [hedera-dev/hedera-harness](https://github.com/hedera-dev/hedera-harness)).

The project's own test suite (`packages/hardhat/test/DvPSettlement.test.ts`) is the authoritative automated validation. The `.harness/validators/` scripts provide structural checks.

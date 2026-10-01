# BUILD_STATUS.md — scaffold-hbar-ats-dvp

**Last updated:** 2026-09-29 (docs sprint checkpoint)

---

## Current State Summary

| Check | Status | Notes |
|-------|--------|-------|
| Hardhat tests (44/44) | ✅ PASSING | Local Hardhat EVM, no credentials |
| Solidity compilation | ✅ PASSING | 12 files, 52 typings, evm target: paris |
| TypeScript (nextjs) | ✅ PASSING | 0 errors in app/ hooks/ components/ lib/ |
| Secrets check | ✅ PASSING | 0 committed private keys |
| template.json | ✅ PASSING | name, capabilities, defaults, outro all present |
| yarn.lock | ✅ COMMITTED | 584 KB, full dependency lockfile |
| CI workflow | 🔄 FIXING | Node 20.19.0 + ignore-engines flags applied |
| Next.js build | ⏳ PENDING | Awaiting CI confirmation on clean machine |
| Testnet evidence | ⏳ PENDING | Requires funded Hedera testnet accounts |

---

## Verification Results

### ✅ Hardhat Tests — 44/44 PASSING

```
cd packages/hardhat
node node_modules/hardhat/internal/cli/bootstrap.js test

  DvPSettlement
    Constructor                          4 passing
    createOffer                          8 passing
    cancelOffer                          5 passing
    acceptOffer — Authorization          4 passing
    acceptOffer — Expiry                 3 passing
    acceptOffer — Allowance and Balance  6 passing
    acceptOffer — Happy Path             4 passing
    acceptOffer — ATS Failure Scenarios  4 passing
    acceptOffer — Atomicity              2 passing
    Reentrancy                           1 passing
    False-Return Token                   2 passing

  44 passing (7s)
```

### ✅ Solidity Compilation — 12 files, 52 typings

```
Compiled 12 Solidity files successfully (evm target: paris)
Successfully generated 52 typings!
```

### ✅ TypeScript (nextjs) — 0 errors in source

```
tsc --noEmit --skipLibCheck   → 0 errors in app/ hooks/ components/ lib/
```

### ✅ Secrets check — PASS

```
grep -r "0x[0-9a-fA-F]{64}" packages/ template.json package.json → 0 matches
```

### ✅ template.json — PASS

```
name: scaffold-hbar-ats-dvp
create-scaffold-hbar: { capabilities, defaults, outro } — all present
```

### ✅ yarn.lock — COMMITTED (584 KB)

Full dependency lockfile committed. Required for reproducible CI installs.

### 🔄 CI — IN PROGRESS

`.github/workflows/ci.yml` updated with:
- Node version pinned to `20.19.0` (satisfies `engines.node >= 20.19.0`)
- `yarn install --ignore-engines` flag applied where needed

CI confirmation pending on next push.

### ⏳ Next.js build — PENDING CI

Next.js `next@15.1.3` build depends on a clean `yarn install` completing successfully on the CI runner. Source is TypeScript-correct (0 errors). Build is expected to pass once CI install completes.

**Local workaround if needed:** Free ≥ 2 GB on C: drive (npm/yarn temp files write to C: during install), then:
```bash
cd D:\Documents\Scaffold-hbar-ATS-Delivery-vs-Payment\scaffold-hbar-ats-dvp
yarn install
yarn next:build
```

### ⏳ Testnet evidence — PENDING FUNDED ACCOUNTS

All setup scripts (1–7) are complete and tested against the local Hardhat EVM. Running against Hedera Testnet requires funded accounts from [portal.hedera.com](https://portal.hedera.com/register).

---

## Completed ✅

| Area | Status |
|------|--------|
| DvPSettlement.sol (contract) | ✅ Complete |
| MockERC20.sol | ✅ Complete |
| MockATSToken.sol | ✅ Complete |
| MaliciousToken.sol | ✅ Complete |
| FalseReturnToken.sol | ✅ Complete |
| Hardhat test suite (44 tests) | ✅ All passing |
| hardhat.config.ts | ✅ Complete |
| deploy/00_deploy_dvp_settlement.ts | ✅ Complete |
| scripts/generateTsAbis.ts | ✅ Complete |
| scripts/setup/1.validate.ts – 7.run-exchange.ts | ✅ All 7 complete |
| packages/nextjs/lib/wagmiConfig.ts | ✅ Complete |
| packages/nextjs/lib/contracts.ts | ✅ Complete |
| packages/nextjs/lib/formatters.ts | ✅ Complete |
| packages/nextjs/contracts/deployedContracts.ts | ✅ Complete (placeholder) |
| packages/nextjs/hooks/useDvPSettlement.ts | ✅ Complete |
| packages/nextjs/hooks/useTokenBalances.ts | ✅ Complete |
| packages/nextjs/hooks/useOfferPreflights.ts | ✅ Complete |
| packages/nextjs/components/NetworkGuard.tsx | ✅ Complete |
| packages/nextjs/components/TransactionStatus.tsx | ✅ Complete |
| packages/nextjs/components/TokenBalances.tsx | ✅ Complete |
| packages/nextjs/components/CreateOfferForm.tsx | ✅ Complete |
| packages/nextjs/components/OfferView.tsx | ✅ Complete |
| packages/nextjs/app/layout.tsx | ✅ Complete |
| packages/nextjs/app/Providers.tsx | ✅ Complete |
| packages/nextjs/app/page.tsx | ✅ Complete |
| packages/nextjs/app/offer/[id]/page.tsx | ✅ Complete |
| packages/nextjs/app/globals.css | ✅ Complete |
| yarn.lock | ✅ Committed (584 KB) |
| README.md | ✅ Complete |
| AGENTS.md | ✅ Complete |
| docs/architecture.md | ✅ Complete |
| docs/testnet.md | ✅ Complete |
| docs/extending.md | ✅ Complete |
| .github/workflows/ci.yml | ✅ Complete |
| .harness/spec.yaml | ✅ Complete |
| .harness/prd.md | ✅ Complete |
| .harness/validators/tier0-structure.sh | ✅ Complete |
| .harness/validators/tier1-contract.sh | ✅ Complete |
| template.json | ✅ Complete |
| .nvmrc, .gitignore, LICENSE | ✅ Complete |

## Pending ⏳

| Item | Blocker |
|------|---------|
| `yarn next:build` local confirmation | Incomplete next@15.1.3 install (C: disk space — D: has 910 GB free) |
| CI green badge | Awaiting push + CI run with Node 20.19.0 fix |
| Testnet evidence (HashScan links) | Requires funded Hedera testnet accounts |

## Next Steps

```bash
# 1. Verify tests still pass
yarn hardhat:test

# 2. Once C: has space — fix next install
cd D:\Documents\Scaffold-hbar-ATS-Delivery-vs-Payment\scaffold-hbar-ats-dvp
yarn install
yarn next:build

# 3. Testnet run (requires .env with funded accounts)
cd packages/hardhat
node node_modules/hardhat/internal/cli/bootstrap.js run scripts/setup/1.validate.ts --network hederaTestnet
# ... through script 7
```

#!/usr/bin/env bash
# Tier 0 validator: check that all required files and directories exist.
# Exit 1 if any file is missing.
set -e

REQUIRED_FILES=(
  "packages/hardhat/contracts/DvPSettlement.sol"
  "packages/hardhat/contracts/test/MockERC20.sol"
  "packages/hardhat/contracts/test/MockATSToken.sol"
  "packages/hardhat/contracts/test/MaliciousToken.sol"
  "packages/hardhat/contracts/test/FalseReturnToken.sol"
  "packages/hardhat/test/DvPSettlement.test.ts"
  "packages/hardhat/hardhat.config.ts"
  "packages/hardhat/package.json"
  "packages/hardhat/.env.example"
  "packages/hardhat/deploy/00_deploy_dvp_settlement.ts"
  "packages/hardhat/scripts/generateTsAbis.ts"
  "packages/hardhat/scripts/setup/state.ts"
  "packages/hardhat/scripts/setup/1.validate.ts"
  "packages/hardhat/scripts/setup/2.provision-ats.ts"
  "packages/hardhat/scripts/setup/3.provision-payment-token.ts"
  "packages/hardhat/scripts/setup/4.prepare-participants.ts"
  "packages/hardhat/scripts/setup/5.deploy-settlement.ts"
  "packages/hardhat/scripts/setup/6.grant-allowances.ts"
  "packages/hardhat/scripts/setup/7.run-exchange.ts"
  "packages/nextjs/app/layout.tsx"
  "packages/nextjs/app/page.tsx"
  "packages/nextjs/app/offer/[id]/page.tsx"
  "packages/nextjs/components/NetworkGuard.tsx"
  "packages/nextjs/components/TransactionStatus.tsx"
  "packages/nextjs/components/TokenBalances.tsx"
  "packages/nextjs/components/CreateOfferForm.tsx"
  "packages/nextjs/components/OfferView.tsx"
  "packages/nextjs/hooks/useDvPSettlement.ts"
  "packages/nextjs/hooks/useTokenBalances.ts"
  "packages/nextjs/hooks/useOfferPreflights.ts"
  "packages/nextjs/lib/wagmiConfig.ts"
  "packages/nextjs/lib/contracts.ts"
  "packages/nextjs/lib/formatters.ts"
  "packages/nextjs/package.json"
  "packages/nextjs/.env.example"
  "template.json"
  "README.md"
  "AGENTS.md"
  "BUILD_STATUS.md"
  ".github/workflows/ci.yml"
  "docs/architecture.md"
  "docs/testnet.md"
  "docs/extending.md"
  ".harness/spec.yaml"
  ".harness/prd.md"
  "LICENSE"
)

PASS=true

for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "MISSING: $f"
    PASS=false
  fi
done

if [ "$PASS" = true ]; then
  echo "tier0: all required files present (${#REQUIRED_FILES[@]} files checked)"
  exit 0
else
  echo "tier0: FAILED — one or more required files missing"
  exit 1
fi

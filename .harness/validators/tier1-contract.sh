#!/usr/bin/env bash
# Tier 1 validator: compile DvPSettlement.sol and verify it succeeds.
set -e

echo "tier1: compiling DvPSettlement.sol..."

cd packages/hardhat
yarn hardhat compile

if [ -f "artifacts/contracts/DvPSettlement.sol/DvPSettlement.json" ]; then
  echo "tier1: DvPSettlement.sol compiled successfully"
  exit 0
else
  echo "tier1: FAILED — DvPSettlement.json artifact not found after compile"
  exit 1
fi

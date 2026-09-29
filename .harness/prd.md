# Product Requirements Document — DvP Settlement Feature

## Feature Overview

Bilateral delivery-versus-payment (DvP) settlement: a seller atomically
exchanges a permissioned ATS security token for an HTS payment token in
a single on-chain transaction.

## Atomic Settlement Requirement

Both token transfers MUST succeed atomically or NEITHER must occur.
The EVM transaction semantics guarantee this when:
1. No try/catch wraps the transfer calls.
2. Both `transferFrom` return values are checked with `require`.
3. The offer status is updated before transfers (CEI pattern).

## Supported Token Types

### ATS Asset (seller → buyer)
- ERC-20-compatible smart contract token
- Implements `IERC20.transferFrom` via standard allowance
- KYC/eligibility enforcement on the buyer (`to` address) built into token
- Default partition only — no protected partitions
- Must not be paused or globally frozen at settlement time

### HTS Payment Token (buyer → seller)
- Native Hedera Token Service fungible token
- Accessed via the HTS precompile at `0x0000000000000000000000000000000000000167`
- Standard ERC-20 interface from Solidity perspective
- No custom fees, no rebasing

## Participant Roles

| Role | Address | Responsibility |
|---|---|---|
| Deployer | Any funded ECDSA account | Deploys DvPSettlement, runs setup scripts |
| ATS Admin | ATS token admin key | Grants/revokes KYC eligibility, manages token |
| Seller | Any eligible account | Creates offers, holds ATS asset, grants allowance |
| Buyer | KYC-eligible account | Accepts offers, holds payment token, grants allowance |

## Non-Upgradeable Contract Requirement

The `DvPSettlement` contract:
- Does NOT use any proxy pattern
- Stores `atsAsset` and `paymentToken` as `immutable` state variables
- Has NO admin functions, NO ownership, NO upgrade path
- Token addresses are set in the constructor and cannot be changed

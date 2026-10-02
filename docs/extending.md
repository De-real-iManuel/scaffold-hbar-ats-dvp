# Extending the Template

## The reusable pattern

`DvPSettlement` is token-agnostic. It settles any two IERC20-compatible tokens atomically. The ATS/HTS pairing is the demonstration domain — the settlement contract is the reusable artifact.

```
Your asset token (any IERC20-compatible)
          ↓
    DvPSettlement.sol     ← stable core, do not modify
          ↓
Your payment token (any IERC20-compatible)
```

To adapt the template: deploy a new `DvPSettlement` instance with different constructor arguments. The contract code does not change.

---

## Connect a different token pair

The `DvPSettlement` constructor takes two addresses:

```typescript
const dvp = await DvPFactory.deploy(
  "0xYOUR_ASSET_TOKEN_ADDRESS",
  "0xYOUR_PAYMENT_TOKEN_ADDRESS"
);
```

After deploying, update environment variables in both packages:

**`packages/hardhat/.env`:**
```
ATS_TOKEN_ADDRESS=0xYOUR_ASSET_TOKEN_ADDRESS
PAYMENT_TOKEN_ADDRESS=0xYOUR_PAYMENT_TOKEN_ADDRESS
DVP_SETTLEMENT_ADDRESS=0xYOUR_NEW_DVP_ADDRESS
```

**`packages/nextjs/.env`:**
```
NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS=0xYOUR_NEW_DVP_ADDRESS
NEXT_PUBLIC_ATS_TOKEN_ADDRESS=0xYOUR_ASSET_TOKEN_ADDRESS
NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=0xYOUR_PAYMENT_TOKEN_ADDRESS
```

### Asset token requirements

- Must implement `IERC20` with a working `transferFrom` via allowance.
- `transferFrom` must return `true` on success (or revert on failure).
- No protected partitions (ERC-1400 partition-aware transfers are not supported through the IERC20 interface).
- Not globally paused at settlement time.

### Payment token requirements

- Must implement `IERC20` with a working `transferFrom` via allowance.
- No custom fees — the effective transfer amount must equal the requested amount.
- Not rebasing — balance must not change between the transfer call and the event.
- For HTS tokens: buyer must have associated the token with their Hedera account before receiving it.

### Token decimal differences

The frontend hardcodes `ATS_DECIMALS = 18` and `PAYMENT_DECIMALS = 6` in `components/OfferView.tsx`. Update these constants if your tokens use different decimals.

---

## Use a real ATS token

The demo uses `MockATSToken`, which simulates KYC/eligibility with a simple mapping. A production deployment uses a real ATS token from [Asset Tokenization Studio](https://docs.hedera.com/hedera/open-source-solutions/asset-tokenization-studio-ats).

To connect a real ATS token:

1. Deploy or obtain an ATS token address from your ATS factory deployment.
2. Set `ATS_TOKEN_ADDRESS=0x...` in `packages/hardhat/.env`.
3. Script 2 will skip deployment and record the address.
4. Script 4 handles participant association and KYC grant — for real ATS tokens, the KYC grant requires the ATS admin key and ATS SDK operations. The script provides the structure; complete the grant via the ATS web UI or SDK if needed.

The settlement contract does not change. It calls `transferFrom` on the ATS token address regardless of whether it is a mock or a real ATS deployment.

---

## Replace the Next.js frontend

The frontend is a thin layer over the `DvPSettlement` ABI. To replace it with a different framework or UI:

The complete ABI is in `hooks/useDvPSettlement.ts`. The contract exposes:

**Write functions:**
- `createOffer(buyer, assetAmount, paymentAmount, expiry) → offerId`
- `cancelOffer(offerId)`
- `acceptOffer(offerId)`

**Read functions:**
- `offers(offerId) → { id, seller, buyer, assetAmount, paymentAmount, expiry, status }`
- `atsAsset() → address`
- `paymentToken() → address`

**Events:**
- `OfferCreated(offerId, seller, buyer, assetAmount, paymentAmount, expiry)`
- `OfferSettled(offerId, seller, buyer, assetAmount, paymentAmount)`
- `OfferCancelled(offerId)`

Any framework that can call EVM smart contracts works: wagmi, ethers.js, viem, web3.js. The contract has no framework-specific dependencies.

The ABI is also available in `packages/hardhat/deployments/hederaTestnet/DvPSettlement.json` after deployment.

---

## Known limits requiring further engineering

| Limit | What it would require |
|---|---|
| Protected ATS partitions | A different transfer path using partition-aware transfer methods; audit of ATS compliance modules |
| Multi-leg settlement (more than 2 tokens) | A more complex settlement contract; reentrancy analysis for N external calls |
| Partial fill | Contract-level partial fill tracking and pro-rata logic |
| Non-IERC20-compatible asset tokens | A custom adapter contract or a different settlement approach |
| On-chain orderbook | Off-chain order matching + on-chain settlement is the standard approach |
| Claim-based settlement (HTLCs) | Replace `acceptOffer` with a hash-time-locked mechanism |
| Multi-network settlement | Cross-chain messaging (Axelar, CCIP, LayerZero) between Hedera and other chains |
| HBAR as payment currency | A new settlement contract that accepts `msg.value` instead of `transferFrom` |
| Unbounded offer lists per address | An index mapping from seller/buyer address to offer IDs |

For production deployment, obtain a security audit of the settlement contract before holding real value.

## Upgrading to a Real ATS Token

The demo uses `MockATSToken` (deployed by `scripts/setup/2.provision-ats.ts`) which simulates ATS KYC/eligibility with a configurable flag. In production, replace it with a real ATS security token deployed via the Asset Tokenization Studio SDK.

### What to install

`@hashgraph/asset-tokenization-sdk` is already in `packages/hardhat/package.json`.

### Testnet factory addresses

| Contract | Address |
|---|---|
| Factory Proxy | `0x5fA65CA30d1984701F10476664327f97c864A9D3` |
| BLR Proxy (resolver) | `0xEFEF4CAe9642631Cfc6d997D6207Ee48fa78fe42` |

Set both in `packages/hardhat/.env`:
```
ATS_FACTORY_ADDRESS=0x5fA65CA30d1984701F10476664327f97c864A9D3
ATS_RESOLVER_ADDRESS=0xEFEF4CAe9642631Cfc6d997D6207Ee48fa78fe42
```

### Which script to modify

Update `packages/hardhat/scripts/setup/2.provision-ats.ts`. When `ATS_FACTORY_ADDRESS` is set, call the ATS `EquityFactory` to deploy a real token instead of deploying `MockATSToken`.

### Key behavior difference

| | `MockATSToken` | Real ATS token |
|---|---|---|
| KYC enforcement | Configurable flag (`blockRecipient`) | Enforced on-chain by the token |
| Transfer restriction | `allTransfersBlocked` flag | Real pause/freeze via ATS admin |
| Production use | Tests and demo only | Regulated assets |

### References

- [ATS SDK documentation](https://docs.tokenization-studio.hedera.com)
- [ATS GitHub](https://github.com/hashgraph/asset-tokenization-studio)
- [ATS quick start](https://docs.tokenization-studio.hedera.com/ats/getting-started/quick-start/)

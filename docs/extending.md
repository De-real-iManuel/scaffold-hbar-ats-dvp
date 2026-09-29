# Extending the Template

## Connect a Different ATS/HTS Token Pair

The `DvPSettlement` contract takes token addresses in its constructor. To use different tokens:

1. **Deploy a new contract** with your token pair:

```typescript
const dvp = await DvPFactory.deploy(
  "0xYOUR_ATS_TOKEN_ADDRESS",
  "0xYOUR_HTS_PAYMENT_TOKEN_ADDRESS"
);
```

2. **Update environment variables** in both packages:
   - `packages/hardhat/.env`: `ATS_TOKEN_ADDRESS`, `PAYMENT_TOKEN_ADDRESS`
   - `packages/nextjs/.env`: `NEXT_PUBLIC_ATS_TOKEN_ADDRESS`, `NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS`

3. **Verify token compatibility:**
   - ATS token: must implement IERC20 with working `transferFrom` via allowance, no protected partitions.
   - Payment token: must be an HTS fungible token with no custom fees, accessible via the HTS precompile.

4. **Update token decimals** in the frontend if they differ from the demo values (18 for ATS, 6 for payment).

## Replace the Next.js Frontend

The frontend is a thin layer over the `DvPSettlement` ABI. To replace it:

1. Read the ABI from `packages/hardhat/deployments/` after deploying.
2. The ABI has three functions: `createOffer`, `cancelOffer`, `acceptOffer`.
3. Two events: `OfferCreated`, `OfferSettled`.
4. One read: `offers(uint256) → Offer`.

Any framework that can call EVM smart contracts (wagmi, ethers.js, viem, web3.js) works. The contract has no framework-specific dependencies.

## Known Limits Requiring Further Engineering

| Limit | What it would require |
|---|---|
| Protected ATS partitions | A different transfer path using partition-aware transfer methods; audit of ATS compliance modules |
| Multi-leg settlement (>2 tokens) | A more complex settlement contract; reentrancy analysis for N transfers |
| Partial fill | Contract-level partial fill tracking and pro-rata logic |
| Non-ERC-20-compatible ATS tokens | A custom adapter contract or a different DvP approach |
| On-chain orderbook | Off-chain order matching + on-chain settlement is the standard approach |
| Claim-based settlement (HTLCs) | Replace `acceptOffer` with a hash-time-locked mechanism |
| Multi-network settlement | Cross-chain messaging (Axelar, CCIP, LayerZero) between Hedera and other chains |

For production deployment, obtain a security audit of the settlement contract before holding real value.

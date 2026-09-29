# Architecture

## Settlement Flow

```mermaid
sequenceDiagram
    participant S as Seller
    participant ATS as ATS Token<br/>(ERC-20 contract)
    participant DVP as DvPSettlement
    participant HTS as HTS Payment Token<br/>(via precompile)
    participant B as Buyer

    Note over S,B: Off-chain: agree on terms

    S->>ATS: approve(dvpAddress, assetAmount)
    Note over ATS: allowance recorded; no balance lock

    S->>DVP: createOffer(buyer, assetAmount, paymentAmount, expiry)
    DVP-->>S: offerId emits OfferCreated

    B->>HTS: approve(dvpAddress, paymentAmount)
    Note over HTS: allowance recorded

    B->>DVP: acceptOffer(offerId)
    DVP->>DVP: CHECKS: caller==buyer, status==Open, timestamp<expiry
    DVP->>DVP: EFFECTS: status = Filled

    DVP->>HTS: transferFrom(buyer, seller, paymentAmount)
    HTS-->>DVP: true (or revert)

    DVP->>ATS: transferFrom(seller, buyer, assetAmount)
    Note over ATS: Enforces KYC on buyer (to address)
    ATS-->>DVP: true (or revert if KYC revoked / paused)

    DVP-->>B: emits OfferSettled
    Note over S,B: Both transfers committed atomically
```

> If either `transferFrom` call reverts or returns `false`, the EVM reverts the entire transaction. Both transfers succeed or neither does.

---

## Trust Boundaries

| Boundary | Description |
|---|---|
| Seller → DvPSettlement | Seller grants allowance and creates offers. The contract cannot take more than the approved amount. |
| Buyer → DvPSettlement | Buyer grants exact payment allowance. Only the buyer can call `acceptOffer`. |
| DvPSettlement → ATS Token | Contract calls `transferFrom` as approved spender. ATS token enforces eligibility internally. |
| DvPSettlement → HTS Precompile | Contract calls `transferFrom` on the HTS precompile address. No special trust — standard ERC-20 call. |
| Seller ↔ Buyer | No direct interaction. The contract enforces atomicity and authorization between them. |

---

## Allowance Model

Creating an offer does **not** reserve tokens. The seller's balance and allowance are verified at acceptance time by the token contracts themselves.

Consequences:
- A seller can create multiple offers for the same asset balance.
- Only the first offer accepted will succeed; subsequent acceptances revert when the balance is depleted.
- This is documented in NatSpec on `createOffer` and in [docs/extending.md](extending.md).

---

## ATS KYC Enforcement

When `DvPSettlement` calls `atsAsset.transferFrom(seller, buyer, assetAmount)`, the ATS token contract's own `transferFrom` logic checks whether the buyer (`to` address) has KYC/eligibility status. If eligibility was granted at offer creation but revoked before acceptance, the `transferFrom` call reverts and the entire settlement transaction reverts — no tokens move.

This is the correct behavior: the ATS token enforces compliance automatically, without the settlement contract needing to know anything about eligibility rules.

---

## Settlement Rollback

Rollback is handled entirely by EVM transaction semantics:

| Scenario | What happens |
|---|---|
| Payment transfer reverts | Entire tx reverts. Offer status stays Open. No tokens move. |
| Payment transfer returns false | `require(paymentOk)` fails. Entire tx reverts. No tokens move. |
| Asset transfer reverts (after payment) | Entire tx reverts. Payment transfer is also rolled back. No tokens move. |
| Asset transfer returns false | `require(assetOk)` fails. Entire tx reverts. Payment transfer rolled back. |

The offer status is set to `Filled` before any transfer call (CEI pattern). If the transaction reverts, that write is also rolled back — the offer remains `Open`.

---

## Unsupported Configurations

| Configuration | What happens |
|---|---|
| ATS token with protected partitions | `transferFrom` on default partition may fail or behave unexpectedly. `acceptOffer` reverts. No tokens move. |
| ATS token globally paused | `transferFrom` reverts at the token level. `acceptOffer` reverts. No tokens move. |
| HTS payment token with custom fees | Effective transfer amount differs from requested amount. Not supported — do not use. |
| Rebasing payment token | Token balance changes post-transfer. Undefined behavior — not supported. |

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DvPSettlement
 * @notice Bilateral delivery-versus-payment settlement contract.
 *
 * A seller and buyer agree off-chain on terms, then the seller creates
 * an on-chain offer. The designated buyer accepts the offer, triggering
 * one atomic transaction that:
 *   1. Transfers `paymentAmount` of `paymentToken` from buyer to seller.
 *   2. Transfers `assetAmount` of `atsAsset` from seller to buyer.
 *
 * If either transfer fails for any reason, the entire transaction reverts
 * and neither party loses tokens.
 *
 * @dev Security properties:
 *   - Non-upgradeable: token addresses are immutable.
 *   - Reentrancy: protected via OpenZeppelin ReentrancyGuard on acceptOffer.
 *   - CEI pattern: offer status written to Filled BEFORE any external call.
 *   - Once-only: Filled and Cancelled offers cannot be acted upon.
 *   - False-return: both transferFrom returns are checked with require().
 *   - IERC20 only: no forced/controller/ATS-specific transfer methods used.
 *
 * Supported token configurations:
 *   - atsAsset: any IERC20-compatible token where transferFrom via allowance
 *     works. For ATS tokens: must use the default partition, KYC/eligibility
 *     enabled on buyer, protected partitions NOT used.
 *   - paymentToken: standard HTS fungible token accessed via the HTS precompile
 *     at 0x0000000000000000000000000000000000000167. No custom fees, no rebasing.
 */
contract DvPSettlement is ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Immutable state
    // -------------------------------------------------------------------------

    /// @notice The permissioned ATS asset token (seller transfers to buyer).
    IERC20 public immutable atsAsset;

    /// @notice The HTS payment token (buyer transfers to seller).
    IERC20 public immutable paymentToken;

    // -------------------------------------------------------------------------
    // Offer state
    // -------------------------------------------------------------------------

    /// @notice Possible lifecycle states of an offer.
    enum OfferStatus {
        Open,
        Filled,
        Cancelled
    }

    /**
     * @notice On-chain record of a bilateral DvP trade agreement.
     *
     * @dev Creating an offer does NOT lock or reserve tokens or allowances.
     *      The seller must maintain sufficient balance and allowance until
     *      acceptance or cancellation. If the seller creates multiple open
     *      offers for the same asset, only the first accepted will succeed;
     *      subsequent acceptances will revert on transferFrom due to depleted
     *      balance or allowance.
     */
    struct Offer {
        uint256 id;
        address seller;
        address buyer;
        uint256 assetAmount;    // base units, never floating-point
        uint256 paymentAmount;  // base units, never floating-point
        uint256 expiry;         // Unix timestamp; block.timestamp must be < expiry
        OfferStatus status;
    }

    /// @notice Auto-incrementing offer counter. First offer has id = 1.
    uint256 private _offerCounter;

    /// @notice All offers by ID.
    mapping(uint256 => Offer) public offers;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /**
     * @notice Emitted when a seller creates a new offer.
     * @param offerId  Unique offer identifier (1-based, sequential).
     * @param seller   Address that created the offer (msg.sender at creation).
     * @param buyer    Designated counterparty that may accept this offer.
     * @param assetAmount   ATS token amount seller will transfer to buyer.
     * @param paymentAmount Payment token amount buyer will transfer to seller.
     * @param expiry   Block timestamp after which the offer cannot be accepted.
     */
    event OfferCreated(
        uint256 indexed offerId,
        address indexed seller,
        address indexed buyer,
        uint256 assetAmount,
        uint256 paymentAmount,
        uint256 expiry
    );

    /**
     * @notice Emitted when the seller cancels an open offer.
     * @param offerId The identifier of the cancelled offer.
     */
    event OfferCancelled(uint256 indexed offerId);

    /**
     * @notice Emitted when an offer is successfully settled.
     *         Only emitted after BOTH transfers have succeeded.
     * @param offerId       The identifier of the settled offer.
     * @param seller        Address that provided the ATS asset.
     * @param buyer         Address that provided the payment token.
     * @param assetAmount   ATS tokens transferred from seller to buyer.
     * @param paymentAmount Payment tokens transferred from buyer to seller.
     */
    event OfferSettled(
        uint256 indexed offerId,
        address indexed seller,
        address indexed buyer,
        uint256 assetAmount,
        uint256 paymentAmount
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * @notice Deploy the settlement contract with fixed token pair.
     * @param _atsAsset     EVM address of the ATS asset token (IERC20-compatible).
     * @param _paymentToken EVM address of the HTS payment token.
     *
     * @dev Both addresses are stored as immutables; no admin can change them
     *      post-deployment. Reverts if either address is zero or if both
     *      addresses are identical.
     */
    constructor(address _atsAsset, address _paymentToken) {
        require(_atsAsset != address(0), "zero ats asset");
        require(_paymentToken != address(0), "zero payment token");
        require(_atsAsset != _paymentToken, "same token");
        atsAsset = IERC20(_atsAsset);
        paymentToken = IERC20(_paymentToken);
    }

    // -------------------------------------------------------------------------
    // Offer lifecycle
    // -------------------------------------------------------------------------

    /**
     * @notice Create a new bilateral DvP offer.
     *
     * @dev IMPORTANT — creating an offer does NOT reserve tokens.
     *      The seller's balance and allowance are checked only at acceptance.
     *      Multiple open offers for the same asset may conflict: when the first
     *      is accepted and depletes the seller's balance or allowance, subsequent
     *      acceptances will revert.
     *
     * @param buyer         Address of the designated buyer (must differ from caller).
     * @param assetAmount   Amount of atsAsset (in base units) seller will transfer.
     * @param paymentAmount Amount of paymentToken (in base units) buyer will transfer.
     * @param expiry        Unix timestamp after which acceptance is not allowed.
     *                      Must be strictly greater than block.timestamp.
     * @return offerId      Unique 1-based identifier for the created offer.
     */
    function createOffer(
        address buyer,
        uint256 assetAmount,
        uint256 paymentAmount,
        uint256 expiry
    ) external returns (uint256 offerId) {
        // CHECKS
        require(buyer != address(0), "zero buyer");
        require(msg.sender != buyer, "seller is buyer");
        require(assetAmount > 0, "zero asset amount");
        require(paymentAmount > 0, "zero payment amount");
        require(expiry > block.timestamp, "expiry in past");

        // EFFECTS
        offerId = ++_offerCounter;
        offers[offerId] = Offer({
            id: offerId,
            seller: msg.sender,
            buyer: buyer,
            assetAmount: assetAmount,
            paymentAmount: paymentAmount,
            expiry: expiry,
            status: OfferStatus.Open
        });

        emit OfferCreated(offerId, msg.sender, buyer, assetAmount, paymentAmount, expiry);
    }

    /**
     * @notice Cancel an open offer. Only the original seller may cancel.
     * @param offerId The identifier of the offer to cancel.
     */
    function cancelOffer(uint256 offerId) external {
        Offer storage offer = offers[offerId];

        // CHECKS
        require(offer.seller == msg.sender, "not seller");
        require(offer.status == OfferStatus.Open, "not open");

        // EFFECTS
        offer.status = OfferStatus.Cancelled;

        emit OfferCancelled(offerId);
    }

    /**
     * @notice Accept an open offer, executing the atomic DvP settlement.
     *
     * @dev Transfer order: payment first (buyer → seller), then asset
     *      (seller → buyer). Both orderings are equally atomic via EVM
     *      transaction semantics. If the asset transfer fails after the
     *      payment transfer has succeeded, the EVM reverts ALL state changes
     *      in the transaction — including the payment transfer.
     *
     * The offer status is set to Filled BEFORE any external call (CEI pattern).
     * This prevents reentrancy from accepting the same offer twice even without
     * the nonReentrant modifier, but the modifier is also present for defence
     * in depth.
     *
     * @param offerId The identifier of the offer to accept.
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];

        // CHECKS
        require(offer.buyer == msg.sender, "not buyer");
        require(offer.status == OfferStatus.Open, "not open");
        require(block.timestamp < offer.expiry, "expired");

        // EFFECTS — written before any external call (CEI)
        offer.status = OfferStatus.Filled;

        // INTERACTIONS
        // Step 1: pull payment from buyer to seller
        bool paymentOk = paymentToken.transferFrom(
            offer.buyer,
            offer.seller,
            offer.paymentAmount
        );
        require(paymentOk, "payment transfer failed");

        // Step 2: transfer ATS asset from seller to buyer
        // ATS token will enforce KYC/eligibility on the buyer (to address)
        // inside its own transferFrom. If KYC was revoked after offer creation,
        // this call reverts and the entire transaction (including step 1) reverts.
        bool assetOk = atsAsset.transferFrom(
            offer.seller,
            offer.buyer,
            offer.assetAmount
        );
        require(assetOk, "asset transfer failed");

        emit OfferSettled(
            offerId,
            offer.seller,
            offer.buyer,
            offer.assetAmount,
            offer.paymentAmount
        );
    }
}

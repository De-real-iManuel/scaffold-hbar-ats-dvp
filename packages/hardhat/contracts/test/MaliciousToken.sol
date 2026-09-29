// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC20} from "./MockERC20.sol";

interface IDvPSettlement {
    function acceptOffer(uint256 offerId) external;
}

/**
 * @title MaliciousToken
 * @notice Attempts a reentrant call to DvPSettlement.acceptOffer during transferFrom.
 * @dev Test helper for verifying ReentrancyGuard protection.
 *      Set the reentry target with setReentryTarget before use.
 * NOT for production use.
 */
contract MaliciousToken is MockERC20 {
    /// @notice The DvPSettlement contract to reenter.
    address public dvp;

    /// @notice The offer ID to attempt when reentering.
    uint256 public targetOfferId;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) MockERC20(name, symbol, decimals_) {}

    /**
     * @notice Configure the reentry target.
     * @param _dvp         Address of the DvPSettlement contract.
     * @param _offerId     Offer ID to call acceptOffer with during reentry.
     */
    function setReentryTarget(address _dvp, uint256 _offerId) external {
        dvp = _dvp;
        targetOfferId = _offerId;
    }

    /**
     * @dev Before completing the normal transfer, attempts a reentrant call
     *      to DvPSettlement.acceptOffer. The nonReentrant guard on that function
     *      should cause this to revert.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        if (dvp != address(0)) {
            // Attempt reentrancy — expected to revert with ReentrancyGuard error
            IDvPSettlement(dvp).acceptOffer(targetOfferId);
        }
        return super.transferFrom(from, to, amount);
    }
}

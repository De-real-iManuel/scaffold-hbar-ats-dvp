// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC20} from "./MockERC20.sol";

/**
 * @title MockATSToken
 * @notice Simulates an ATS token with configurable KYC and pause behavior.
 * @dev Test helper. Extends MockERC20 with two failure modes:
 *   1. blockRecipient(address): simulates KYC/eligibility revocation for a
 *      specific buyer address. Causes transferFrom to revert for that buyer.
 *   2. blockAllTransfers(): simulates a global token pause. All transferFrom
 *      calls revert.
 * NOT for production use.
 */
contract MockATSToken is MockERC20 {
    /// @notice Addresses whose eligibility has been revoked (KYC simulation).
    mapping(address => bool) public blockedRecipients;

    /// @notice When true, all transferFrom calls revert (pause simulation).
    bool public allTransfersBlocked;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) MockERC20(name, symbol, decimals_) {}

    /// @notice Revoke eligibility for a specific recipient address.
    function blockRecipient(address who) external {
        blockedRecipients[who] = true;
    }

    /// @notice Restore eligibility for a specific recipient address.
    function unblockRecipient(address who) external {
        blockedRecipients[who] = false;
    }

    /// @notice Pause all transfers (simulates ATS token pause).
    function blockAllTransfers() external {
        allTransfersBlocked = true;
    }

    /// @notice Unpause all transfers.
    function unblockAllTransfers() external {
        allTransfersBlocked = false;
    }

    /**
     * @dev Overrides ERC20.transferFrom to enforce mock ATS restrictions.
     *      Checks are applied before the standard allowance/balance logic.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(!allTransfersBlocked, "ATS: paused");
        require(!blockedRecipients[to], "ATS: buyer not eligible");
        return super.transferFrom(from, to, amount);
    }
}

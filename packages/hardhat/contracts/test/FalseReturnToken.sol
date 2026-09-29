// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MockERC20} from "./MockERC20.sol";

/**
 * @title FalseReturnToken
 * @notice ERC-20 token whose transferFrom always returns false without reverting.
 * @dev Test helper for verifying that DvPSettlement correctly handles tokens
 *      that signal failure by returning false rather than reverting.
 *      The require() guards in acceptOffer must catch this.
 *      NOT for production use.
 */
contract FalseReturnToken is MockERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) MockERC20(name, symbol, decimals_) {}

    /**
     * @dev Always returns false without reverting.
     *      Used to verify that the settlement contract treats false returns
     *      as failures.
     */
    function transferFrom(
        address, /* from */
        address, /* to */
        uint256  /* amount */
    ) public pure override returns (bool) {
        return false;
    }
}
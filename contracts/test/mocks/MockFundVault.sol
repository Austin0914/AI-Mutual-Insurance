// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IFundVault } from "../../src/interfaces/IFundVault.sol";

/// @title MockFundVault — 測試用金庫，僅記錄 settle 呼叫
/// @notice 供 DisputeManager 分派 / 投票流程測試使用，不涉及真實代幣轉移。
contract MockFundVault is IFundVault {
    mapping(address => uint256) public override contributionOf;
    mapping(address => ParticipantType) public override participantTypeOf;
    bool public override active = true;

    uint256 public settleCount;
    address public lastSubscriber;
    uint256 public lastLoss;
    uint256 public lastDeductibleBps;
    uint256 public lastCoverageK;

    function setParticipant(address account, ParticipantType pType, uint256 contribution) external {
        participantTypeOf[account] = pType;
        contributionOf[account] = contribution;
    }

    function setActive(bool active_) external {
        active = active_;
    }

    /// @inheritdoc IFundVault
    function settle(address subscriber, uint256 loss, uint256 deductibleBps, uint256 coverageK) external override {
        settleCount++;
        lastSubscriber = subscriber;
        lastLoss = loss;
        lastDeductibleBps = deductibleBps;
        lastCoverageK = coverageK;
    }
}

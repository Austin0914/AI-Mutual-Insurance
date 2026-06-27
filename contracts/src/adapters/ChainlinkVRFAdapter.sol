// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import { VRFV2PlusClient } from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import { IRandomnessProvider } from "../interfaces/IRandomnessProvider.sol";
import { IRandomnessConsumer } from "../interfaces/IRandomnessConsumer.sol";

/// @title ChainlinkVRFAdapter — 以 Chainlink VRF v2.5 實作 IRandomnessProvider（adapter）
/// @notice 依 ADR-0002（ports-and-adapters），把 Chainlink VRF 的非同步請求 / 回呼，
///         轉接到協議的 IRandomnessProvider / IRandomnessConsumer 介面。
/// @dev 改寫自專案參考的 VRF v2.5 範例。請求只接受設定的 consumer；VRF 回呼後轉發給 consumer。
contract ChainlinkVRFAdapter is VRFConsumerBaseV2Plus, IRandomnessProvider {
    /// @notice 唯一允許請求與接收隨機的合約（通常為 DisputeManager）
    /// @dev 部署時為避免與 consumer 的循環依賴，改以一次性 setConsumer 綁定（onlyOwner）。
    IRandomnessConsumer public consumer;

    /// @notice gas lane keyHash
    bytes32 public immutable keyHash;

    /// @notice VRF subscription ID
    uint256 public immutable subscriptionId;

    /// @notice callback gas 上限
    uint32 public immutable callbackGasLimit;

    /// @notice 區塊確認數
    uint16 public immutable requestConfirmations;

    /// @notice true 表示以原生幣（如 Sepolia ETH）付款，false 表示以 LINK 付款
    bool public immutable nativePayment;

    /// @notice consumer 綁定完成
    event ConsumerSet(IRandomnessConsumer indexed consumer);

    error OnlyConsumer();
    error ZeroConsumer();
    error ConsumerAlreadySet();

    /// @param vrfCoordinator       VRF Coordinator v2.5 地址
    /// @param keyHash_             gas lane keyHash
    /// @param subscriptionId_      VRF subscription ID
    /// @param callbackGasLimit_    callback gas 上限
    /// @param requestConfirmations_ 區塊確認數
    /// @param nativePayment_       是否以原生幣付款
    /// @dev consumer 於部署後以 setConsumer 綁定，打破與 DisputeManager 的循環依賴。
    constructor(
        address vrfCoordinator,
        bytes32 keyHash_,
        uint256 subscriptionId_,
        uint32 callbackGasLimit_,
        uint16 requestConfirmations_,
        bool nativePayment_
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        keyHash = keyHash_;
        subscriptionId = subscriptionId_;
        callbackGasLimit = callbackGasLimit_;
        requestConfirmations = requestConfirmations_;
        nativePayment = nativePayment_;
    }

    /// @notice 一次性綁定隨機消費端（DisputeManager），打破部署循環依賴
    /// @dev 僅 owner 可呼叫，且只能設定一次以防事後劫持回呼路由。
    /// @param consumer_ 隨機消費端
    function setConsumer(IRandomnessConsumer consumer_) external onlyOwner {
        if (address(consumer_) == address(0)) revert ZeroConsumer();
        if (address(consumer) != address(0)) revert ConsumerAlreadySet();

        consumer = consumer_;
        emit ConsumerSet(consumer_);
    }

    /// @inheritdoc IRandomnessProvider
    function requestRandomness(uint32 numWords) external override returns (uint256 requestId) {
        if (msg.sender != address(consumer)) revert OnlyConsumer();

        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({ nativePayment: nativePayment }))
            })
        );
    }

    /// @dev VRF Coordinator 驗證 proof 後回呼，轉發給 consumer。
    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        consumer.fulfillRandomness(requestId, randomWords);
    }
}

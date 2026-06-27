// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IRandomnessProvider } from "../../src/interfaces/IRandomnessProvider.sol";
import { IRandomnessConsumer } from "../../src/interfaces/IRandomnessConsumer.sol";

/// @title MockRandomnessProvider — 測試用隨機來源（adapter）
/// @notice 同步記錄請求，並由測試手動 fulfill，模擬 VRF 的非同步回呼。
contract MockRandomnessProvider is IRandomnessProvider {
    IRandomnessConsumer public consumer;

    uint256 public nextRequestId = 1;

    /// @dev requestId => 請求的隨機字數量
    mapping(uint256 => uint32) public numWordsOf;

    function setConsumer(IRandomnessConsumer consumer_) external {
        consumer = consumer_;
    }

    /// @inheritdoc IRandomnessProvider
    function requestRandomness(uint32 numWords) external override returns (uint256 requestId) {
        requestId = nextRequestId++;
        numWordsOf[requestId] = numWords;
    }

    /// @notice 測試以單一種子展開為 numWords 個隨機字後回呼 consumer
    function fulfillWithSeed(uint256 requestId, uint256 seed) external {
        uint32 numWords = numWordsOf[requestId];
        uint256[] memory words = new uint256[](numWords);
        for (uint256 i = 0; i < numWords; i++) {
            words[i] = uint256(keccak256(abi.encode(seed, i)));
        }
        consumer.fulfillRandomness(requestId, words);
    }

    /// @notice 測試直接提供隨機字回呼 consumer
    function fulfillWithWords(uint256 requestId, uint256[] calldata words) external {
        consumer.fulfillRandomness(requestId, words);
    }
}

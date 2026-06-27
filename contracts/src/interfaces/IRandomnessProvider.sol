// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title IRandomnessProvider — 可驗證隨機來源介面（port）
/// @notice 依 ADR-0002（ports-and-adapters），核心合約只依賴此介面請求隨機，
///         由 adapter（Chainlink VRF / mock）負責實際取得隨機並回呼 consumer。
interface IRandomnessProvider {
    /// @notice 請求一組隨機字
    /// @param numWords 需要的隨機字數量
    /// @return requestId 本次請求的識別碼；完成後 adapter 會以此 id 回呼 consumer
    function requestRandomness(uint32 numWords) external returns (uint256 requestId);
}

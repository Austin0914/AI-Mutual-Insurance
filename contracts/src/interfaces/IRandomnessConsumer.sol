// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title IRandomnessConsumer — 接收可驗證隨機結果的合約介面（port）
/// @notice 依 ADR-0002（ports-and-adapters），消費端只實作此 callback，
///         不直接依賴任何特定隨機來源（Chainlink VRF / mock 皆可）。
interface IRandomnessConsumer {
    /// @notice 隨機來源於完成後回呼，交付隨機字
    /// @param requestId  對應先前 requestRandomness 回傳的請求識別碼
    /// @param randomWords 隨機字陣列
    function fulfillRandomness(uint256 requestId, uint256[] calldata randomWords) external;
}

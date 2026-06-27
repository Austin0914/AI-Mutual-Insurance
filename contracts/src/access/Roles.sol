// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title Roles — 協議共用的權限角色定義
/// @notice 依 ADR-0002，橫切關注點（權限）集中於 access/ 層，避免各合約重複定義。
library Roles {
    /// @notice 可觸發索賠結算的角色
    /// @dev M3b 起由 DisputeManager 持有：commit-reveal 爭議判定（加權中位數達 quorum）
    ///      後自動觸發 FundVault.settle。部署時須將此角色授予 DisputeManager。
    bytes32 internal constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
}

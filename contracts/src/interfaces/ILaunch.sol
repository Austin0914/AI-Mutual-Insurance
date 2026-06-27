// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title ILaunch — 啟動門檻的共用型別
/// @notice 對應白皮書 §6.1.1（籌備期 → 正式啟動）與 §7.9（啟動條件）。供 LaunchMath 與核心合約共用。
interface ILaunch {
    /// @notice 啟動門檻參數（白皮書 §7.9，數值待模擬校準，不在此寫死）
    /// @param nMin      最小參與公司數 n_min
    /// @param dMin      最小總注資額 D_min
    /// @param hhiMaxBps 風險集中度上限 HHI_max（Herfindahl 指數，基點；10000 = 完全集中於單一參與者）
    /// @param etaMaxBps 單一參與者占比上限 η_max（基點）
    struct LaunchConfig {
        uint256 nMin;
        uint256 dMin;
        uint256 hhiMaxBps;
        uint256 etaMaxBps;
    }

    /// @notice 啟動門檻評估所需的鏈上聚合量（由 FundVault 於注資時 O(1) 增量維護）
    /// @param participantCount 不重複參與者人數 n
    /// @param totalContributed 總注資額 D
    /// @param sumOfSquares     各參與者累計貢獻額的平方和 Σ cⱼ²（供集中度計算）
    /// @param maxContribution  最大單一參與者累計貢獻額 max cⱼ（供 η 計算）
    struct LaunchState {
        uint256 participantCount;
        uint256 totalContributed;
        uint256 sumOfSquares;
        uint256 maxContribution;
    }

    /// @notice 啟動門檻評估結果
    /// @param meetsParticipants  n ≥ n_min
    /// @param meetsDeposit       D ≥ D_min
    /// @param meetsConcentration HHI ≤ HHI_max
    /// @param meetsShare         η_actual ≤ η_max
    /// @param canActivate        以上四者皆成立
    /// @param concentrationBps   實際風險集中度 HHI = Σ cⱼ² / D²（基點；D = 0 時為 0）
    /// @param shareBps           實際單一最大占比 η = max cⱼ / D（基點；D = 0 時為 0）
    struct LaunchStatus {
        bool meetsParticipants;
        bool meetsDeposit;
        bool meetsConcentration;
        bool meetsShare;
        bool canActivate;
        uint256 concentrationBps;
        uint256 shareBps;
    }
}

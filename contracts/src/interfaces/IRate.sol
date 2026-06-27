// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title IRate — 動態費率的共用型別
/// @notice 對應 docs/specs/dynamic-rate.md 與白皮書 §6.4。供 RateMath 與核心合約共用。
interface IRate {
    /// @notice 某風險分群下一期費率的計算輸入
    /// @param caseCount            該分群累積案件量 n（驅動信度）
    /// @param fullThreshold        完全可信門檻 N_full（n 達此值時 Z = 1）
    /// @param providerRExpBps      提供商經驗費率 R_exp（基點）
    /// @param providerRManualBps   提供商基準費率 R_manual（基點）
    /// @param subscriberRExpBps    使用者經驗費率 R_exp（基點）
    /// @param subscriberRManualBps 使用者基準費率 R_manual（基點）
    /// @param providerCapBps       提供商費率天花板（基點，防主動掏空，§7.4）
    struct RateInput {
        uint256 caseCount;
        uint256 fullThreshold;
        uint256 providerRExpBps;
        uint256 providerRManualBps;
        uint256 subscriberRExpBps;
        uint256 subscriberRManualBps;
        uint256 providerCapBps;
    }

    /// @notice 費率計算結果
    /// @param zBps            信度因子 Z（基點，0–10000）
    /// @param providerRateBps   提供商費率 A_provider%（已套天花板，基點）
    /// @param subscriberRateBps 使用者費率 A_subscriber%（已夾到不超過 provider，基點）
    struct RateResult {
        uint256 zBps;
        uint256 providerRateBps;
        uint256 subscriberRateBps;
    }
}

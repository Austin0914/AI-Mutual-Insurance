// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { ILaunch } from "../interfaces/ILaunch.sol";

/// @title LaunchMath — 啟動門檻評估（純函式、無狀態）
/// @notice 對應白皮書 §6.1.1 / §7.9。協議「基金是否達到正式啟動門檻」判定的單一來源，
///         依 ADR-0002 以 library 形式只實作一次，禁止在他處重抄。
/// @dev 白皮書啟動條件：Active = 1 ⟺ n ≥ n_min ∧ D ≥ D_min ∧ N_eff ≥ N_eff,min ∧ HHI ≤ HHI_max ∧ η ≤ η_max。
///      關鍵：N_eff = 1 / Σqⱼ² 與 HHI = Σqⱼ² 互為倒數（qⱼ = cⱼ / D 為占比），故
///      「N_eff ≥ N_eff,min」等價於「HHI ≤ HHI_max」（取 HHI_max = 1 / N_eff,min）；
///      本庫以單一集中度指標 HHI 表達該條件。受益所有人分組（白皮書 §6.1.1：同一受益所有人
///      控制的公司合併計算）屬鏈下 KYC，鏈上以「每地址」近似。
///      溢位假設：sumOfSquares 與 D² 以 checked math 計算；單一地址累計貢獻 < ~1e30
///      時不致溢位（1e30² × 1e4 < 2²⁵⁶）。實務注資量遠低於此界。
library LaunchMath {
    /// @notice 基點分母（10000 = 100%）
    uint256 internal constant BPS = 10_000;

    /// @notice 風險集中度 HHI = Σ cⱼ² / D²（基點）
    /// @dev D = 0（無注資）時集中度未定義，回傳 0；搭配寬鬆門檻可允許空池啟動（供本地測試）。
    /// @param sumOfSquares     各參與者累計貢獻額的平方和 Σ cⱼ²
    /// @param totalContributed 總注資額 D
    /// @return 集中度（基點，0–10000）
    function concentrationBps(uint256 sumOfSquares, uint256 totalContributed) internal pure returns (uint256) {
        if (totalContributed == 0) return 0;
        return (sumOfSquares * BPS) / (totalContributed * totalContributed);
    }

    /// @notice 單一最大占比 η = max cⱼ / D（基點）
    /// @dev D = 0 時回傳 0。
    /// @param maxContribution  最大單一參與者累計貢獻額 max cⱼ
    /// @param totalContributed 總注資額 D
    /// @return 最大占比（基點，0–10000）
    function shareBps(uint256 maxContribution, uint256 totalContributed) internal pure returns (uint256) {
        if (totalContributed == 0) return 0;
        return (maxContribution * BPS) / totalContributed;
    }

    /// @notice 評估啟動門檻四條件
    /// @param config 門檻參數（見 ILaunch.LaunchConfig）
    /// @param state  鏈上聚合量（見 ILaunch.LaunchState）
    /// @return status 各條件與整體是否達標（見 ILaunch.LaunchStatus）
    function evaluate(ILaunch.LaunchConfig memory config, ILaunch.LaunchState memory state)
        internal
        pure
        returns (ILaunch.LaunchStatus memory status)
    {
        uint256 hhi = concentrationBps(state.sumOfSquares, state.totalContributed);
        uint256 eta = shareBps(state.maxContribution, state.totalContributed);

        status.concentrationBps = hhi;
        status.shareBps = eta;
        status.meetsParticipants = state.participantCount >= config.nMin;
        status.meetsDeposit = state.totalContributed >= config.dMin;
        status.meetsConcentration = hhi <= config.hhiMaxBps;
        status.meetsShare = eta <= config.etaMaxBps;
        status.canActivate =
            status.meetsParticipants && status.meetsDeposit && status.meetsConcentration && status.meetsShare;
    }
}

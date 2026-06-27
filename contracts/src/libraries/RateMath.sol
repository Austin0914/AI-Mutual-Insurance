// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { IRate } from "../interfaces/IRate.sol";

/// @title RateMath — 動態費率計算（純函式、無狀態）
/// @notice 對應 docs/specs/dynamic-rate.md 與白皮書 §6.4。協議中所有「費率混合」計算的
///         單一來源，依 ADR-0002 以 library 形式只實作一次，禁止在他處重抄。
/// @dev 三層費率：A% = Z × R_exp + (1 − Z) × R_manual。信度 Z 採線性限波法
///      Z = min(1, n / N_full)。約束（§7.4）以 clamp 處理：provider 夾天花板、
///      subscriber 夾到不超過 provider，確保 provider >= subscriber。
///      費率單位為基點，示意值待校準，不在此寫死。
library RateMath {
    /// @notice 基點分母（10000 = 100%）
    uint256 internal constant BPS = 10_000;

    /// @notice 完全可信門檻為零，無法計算信度
    error ZeroThreshold();

    /// @notice 線性限波信度因子 Z = min(1, n / N_full)
    /// @param caseCount     該分群累積案件量 n
    /// @param fullThreshold 完全可信門檻 N_full（須 > 0）
    /// @return zBps 信度因子（基點，0–10000）
    function credibilityZ(uint256 caseCount, uint256 fullThreshold) internal pure returns (uint256 zBps) {
        if (fullThreshold == 0) revert ZeroThreshold();
        if (caseCount >= fullThreshold) return BPS;
        return (caseCount * BPS) / fullThreshold;
    }

    /// @notice 信度加權混合 A% = (Z × R_exp + (BPS − Z) × R_manual) / BPS
    /// @dev 呼叫端須確保 zBps <= BPS（credibilityZ 已保證）。
    /// @param rExpBps    經驗費率 R_exp（基點）
    /// @param rManualBps 基準費率 R_manual（基點）
    /// @param zBps       信度因子 Z（基點）
    /// @return aBps 混合後費率（基點）
    function blendRate(uint256 rExpBps, uint256 rManualBps, uint256 zBps) internal pure returns (uint256 aBps) {
        return (zBps * rExpBps + (BPS - zBps) * rManualBps) / BPS;
    }

    /// @notice 計算某風險分群下一期的 provider / subscriber 費率
    /// @dev 不變量：
    ///      - zBps <= BPS
    ///      - providerRateBps <= providerCapBps
    ///      - providerRateBps >= subscriberRateBps
    /// @param input 費率計算輸入（見 IRate.RateInput）
    /// @return result provider / subscriber 費率與信度（見 IRate.RateResult）
    function compute(IRate.RateInput memory input) internal pure returns (IRate.RateResult memory result) {
        uint256 zBps = credibilityZ(input.caseCount, input.fullThreshold);

        uint256 providerRate = blendRate(input.providerRExpBps, input.providerRManualBps, zBps);
        uint256 subscriberRate = blendRate(input.subscriberRExpBps, input.subscriberRManualBps, zBps);

        // §7.4：提供商費率設天花板，防主動掏空。
        if (providerRate > input.providerCapBps) {
            providerRate = input.providerCapBps;
        }

        // 約束 provider >= subscriber：若反轉，將 subscriber 夾到 provider。
        if (subscriberRate > providerRate) {
            subscriberRate = providerRate;
        }

        result = IRate.RateResult({ zBps: zBps, providerRateBps: providerRate, subscriberRateBps: subscriberRate });
    }
}

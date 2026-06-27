// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { ITranche } from "../interfaces/ITranche.sol";

/// @title TrancheMath — 分層償付計算（純函式、無狀態）
/// @notice 對應 docs/specs/tranche.md。協議中所有「分層償付」計算的單一來源，
///         依 ADR-0002 以 library 形式只實作一次，禁止在他處重抄。
/// @dev    本 library 只處理「單筆損失」的分層拆分（自負額 / 共同池上限 / 殘額）。
///         池餘額不足時的 pro-rata haircut 屬池層（FundVault）職責，不在此處理。
library TrancheMath {
    /// @notice 基點分母（10000 = 100%）
    uint256 internal constant BPS = 10_000;

    /// @notice 自負額比例超過 100%
    error DeductibleTooHigh(uint256 deductibleBps);

    /// @notice 計算單筆損失的三層分配
    /// @dev 不變量：
    ///      - deductible == loss × deductibleBps / BPS
    ///      - poolPayout <= coverageK × userContribution（共同池上限）
    ///      - poolPayout <= loss − deductible
    ///      - deductible + poolPayout + residual == loss
    /// @param input 分層計算輸入（見 ITranche.TrancheInput）
    /// @return result 三層分配結果（見 ITranche.TrancheResult）
    function compute(ITranche.TrancheInput memory input) internal pure returns (ITranche.TrancheResult memory result) {
        if (input.deductibleBps > BPS) {
            revert DeductibleTooHigh(input.deductibleBps);
        }

        // 第一層：使用者自負額 D = d × L
        uint256 deductible = (input.loss * input.deductibleBps) / BPS;

        // 扣除自負額後，共同池可填補的基準額
        uint256 afterDeductible = input.loss - deductible;

        // 第二層：共同池上限 cap = k × C_user，實付取 min(基準額, 上限)
        uint256 cap = input.coverageK * input.userContribution;
        uint256 poolPayout = afterDeductible < cap ? afterDeductible : cap;

        // 第三層：殘額（→ 巨災層 / 法律途徑）
        uint256 residual = afterDeductible - poolPayout;

        result = ITranche.TrancheResult({ deductible: deductible, poolPayout: poolPayout, residual: residual });
    }
}

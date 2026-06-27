// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title ITranche — 分層償付的共用型別
/// @notice 對應 docs/specs/tranche.md。供 TrancheMath 與核心合約共用。
interface ITranche {
    /// @notice 單筆損失的分層計算輸入
    /// @param loss             損失金額 L（鑑定認定）
    /// @param deductibleBps    使用者自負額比例 d，以基點表示（10000 = 100%）
    /// @param coverageK        共同池賠付上限倍率 k
    /// @param userContribution 該使用者累積貢獻額 C_user
    struct TrancheInput {
        uint256 loss;
        uint256 deductibleBps;
        uint256 coverageK;
        uint256 userContribution;
    }

    /// @notice 單筆損失的分層計算結果，三者加總等於 loss
    /// @param deductible 第一層：使用者自負額 D = d × L
    /// @param poolPayout 第二層：共同池實付（設上限 k × C_user）
    /// @param residual   超出共同池能力的殘額（→ 巨災層 / 法律途徑）
    struct TrancheResult {
        uint256 deductible;
        uint256 poolPayout;
        uint256 residual;
    }
}

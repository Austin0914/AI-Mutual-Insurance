// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

/// @title VoteTally — 鑑定投票的純統計函式（加權中位數 + 出席門檻）
/// @notice 對應 docs/specs/commit-reveal.md §5「加權統計」。依 ADR-0002，
///         統計公式寫成無狀態 library，所有合約呼叫同一份，杜絕重複實作。
/// @dev 設計選擇：責任比例採「質押加權中位數」聚合，抗極端值操縱、貼合 Schelling point。
library VoteTally {
    /// @notice 基點分母（10000 = 100%）
    uint256 internal constant BPS = 10_000;

    /// @notice 揭露的票數為零，無法計算中位數
    error NoReveals();

    /// @notice ratios 與 weights 長度不一致
    error LengthMismatch();

    /// @notice 計算質押加權中位數
    /// @dev 將 (ratio, weight) 依 ratio 升冪排序，回傳累積權重首度達總權重一半（含）時的 ratio
    ///      （lower weighted median，結果具決定性）。輸入陣列在記憶體中就地排序。
    /// @param ratios  各揭露票的責任比例（呼叫端保證每個 <= BPS）
    /// @param weights 各票對應的權重（分派時快照的質押額，皆 > 0）
    /// @return median 加權中位數比例
    function weightedMedian(uint256[] memory ratios, uint256[] memory weights) internal pure returns (uint256 median) {
        uint256 n = ratios.length;
        if (n != weights.length) revert LengthMismatch();
        if (n == 0) revert NoReveals();

        _sortByRatio(ratios, weights);

        uint256 totalWeight;
        for (uint256 i = 0; i < n; i++) {
            totalWeight += weights[i];
        }

        // 找出累積權重首度達 totalWeight 一半（含）的 ratio。
        // 使用 2*cumulative >= totalWeight 以避免除法的捨入問題。
        uint256 cumulative;
        for (uint256 i = 0; i < n; i++) {
            cumulative += weights[i];
            if (2 * cumulative >= totalWeight) {
                return ratios[i];
            }
        }

        // 理論上不會到此（最後一筆必滿足條件），保底回傳最大值。
        return ratios[n - 1];
    }

    /// @notice 出席權重是否達門檻
    /// @param revealedWeight 已揭露票的權重總和
    /// @param totalWeight    被指派者的權重總和（分派時快照）
    /// @param quorumBps      門檻比例（基點）
    /// @return met 是否達標
    function meetsQuorum(uint256 revealedWeight, uint256 totalWeight, uint256 quorumBps)
        internal
        pure
        returns (bool met)
    {
        // revealedWeight / totalWeight >= quorumBps / BPS，改寫為乘法避免除法捨入。
        return revealedWeight * BPS >= totalWeight * quorumBps;
    }

    /// @dev 對 (ratios, weights) 依 ratio 升冪做插入排序（鑑定者數量小，O(n^2) 可接受）。
    function _sortByRatio(uint256[] memory ratios, uint256[] memory weights) private pure {
        uint256 n = ratios.length;
        for (uint256 i = 1; i < n; i++) {
            uint256 r = ratios[i];
            uint256 w = weights[i];
            uint256 j = i;
            while (j > 0 && ratios[j - 1] > r) {
                ratios[j] = ratios[j - 1];
                weights[j] = weights[j - 1];
                j--;
            }
            ratios[j] = r;
            weights[j] = w;
        }
    }
}

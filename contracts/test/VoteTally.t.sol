// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { VoteTally } from "../src/libraries/VoteTally.sol";

/// @dev 將 internal library 包成 external，使 vm.expectRevert 能在外部呼叫深度捕捉。
contract VoteTallyHarness {
    function weightedMedian(uint256[] memory ratios, uint256[] memory weights) external pure returns (uint256) {
        return VoteTally.weightedMedian(ratios, weights);
    }

    function meetsQuorum(uint256 revealedWeight, uint256 totalWeight, uint256 quorumBps) external pure returns (bool) {
        return VoteTally.meetsQuorum(revealedWeight, totalWeight, quorumBps);
    }
}

contract VoteTallyTest is Test {
    VoteTallyHarness internal h;

    function setUp() public {
        h = new VoteTallyHarness();
    }

    function _arr(uint256 a) internal pure returns (uint256[] memory out) {
        out = new uint256[](1);
        out[0] = a;
    }

    function _arr(uint256 a, uint256 b, uint256 c) internal pure returns (uint256[] memory out) {
        out = new uint256[](3);
        out[0] = a;
        out[1] = b;
        out[2] = c;
    }

    // --- weightedMedian ---------------------------------------------------

    function test_median_singleVote() public pure {
        uint256[] memory ratios = new uint256[](1);
        uint256[] memory weights = new uint256[](1);
        ratios[0] = 3000;
        weights[0] = 100;
        assertEq(VoteTally.weightedMedian(ratios, weights), 3000);
    }

    function test_median_equalWeights_odd() public pure {
        // 排序後 [2000, 5000, 8000]，等權 → 中位數 5000
        assertEq(VoteTally.weightedMedian(_arr(8000, 2000, 5000), _arr(100, 100, 100)), 5000);
    }

    function test_median_weightSkew() public pure {
        // ratios [1000, 9000, 5000]，weights [10, 1000, 10]
        // 排序後 ratio: 1000(10), 5000(10), 9000(1000)；總權重 1020，半 510
        // 累積：10 → 20 → 1020，首度 2*cum>=1020 在 9000。
        assertEq(VoteTally.weightedMedian(_arr(1000, 9000, 5000), _arr(10, 1000, 10)), 9000);
    }

    function test_median_lowerWeightedAtBoundary() public pure {
        // 排序後 ratio: 2000(50), 8000(50)；總 100，半 50
        // 2*cum: 100>=100 在第一筆 → 取下界 2000
        uint256[] memory ratios = new uint256[](2);
        uint256[] memory weights = new uint256[](2);
        ratios[0] = 8000;
        ratios[1] = 2000;
        weights[0] = 50;
        weights[1] = 50;
        assertEq(VoteTally.weightedMedian(ratios, weights), 2000);
    }

    function test_median_revertsOnEmpty() public {
        uint256[] memory empty = new uint256[](0);
        vm.expectRevert(VoteTally.NoReveals.selector);
        h.weightedMedian(empty, empty);
    }

    function test_median_revertsOnLengthMismatch() public {
        uint256[] memory ratios = new uint256[](2);
        uint256[] memory weights = new uint256[](1);
        vm.expectRevert(VoteTally.LengthMismatch.selector);
        h.weightedMedian(ratios, weights);
    }

    // --- meetsQuorum ------------------------------------------------------

    function test_quorum_met() public pure {
        // 60/100 >= 50% → true
        assertTrue(VoteTally.meetsQuorum(60, 100, 5000));
    }

    function test_quorum_exactBoundary() public pure {
        // 50/100 == 50% → true（>=）
        assertTrue(VoteTally.meetsQuorum(50, 100, 5000));
    }

    function test_quorum_notMet() public pure {
        // 49/100 < 50% → false
        assertFalse(VoteTally.meetsQuorum(49, 100, 5000));
    }

    // --- fuzz：中位數必落在輸入比例範圍內 ---------------------------------

    function testFuzz_medianWithinRange(uint256 r0, uint256 r1, uint256 r2, uint256 w0, uint256 w1, uint256 w2)
        public
        pure
    {
        r0 = bound(r0, 0, VoteTally.BPS);
        r1 = bound(r1, 0, VoteTally.BPS);
        r2 = bound(r2, 0, VoteTally.BPS);
        w0 = bound(w0, 1, 1e18);
        w1 = bound(w1, 1, 1e18);
        w2 = bound(w2, 1, 1e18);

        uint256 m = VoteTally.weightedMedian(_arr(r0, r1, r2), _arr(w0, w1, w2));

        uint256 lo = r0 < r1 ? (r0 < r2 ? r0 : r2) : (r1 < r2 ? r1 : r2);
        uint256 hi = r0 > r1 ? (r0 > r2 ? r0 : r2) : (r1 > r2 ? r1 : r2);
        assertGe(m, lo);
        assertLe(m, hi);
    }
}

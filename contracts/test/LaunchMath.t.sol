// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { LaunchMath } from "../src/libraries/LaunchMath.sol";
import { ILaunch } from "../src/interfaces/ILaunch.sol";

contract LaunchMathTest is Test {
    uint256 internal constant BPS = 10_000;

    function _config(uint256 nMin, uint256 dMin, uint256 hhiMaxBps, uint256 etaMaxBps)
        internal
        pure
        returns (ILaunch.LaunchConfig memory)
    {
        return ILaunch.LaunchConfig({ nMin: nMin, dMin: dMin, hhiMaxBps: hhiMaxBps, etaMaxBps: etaMaxBps });
    }

    function _state(uint256 n, uint256 d, uint256 sumSq, uint256 maxC)
        internal
        pure
        returns (ILaunch.LaunchState memory)
    {
        return ILaunch.LaunchState({
            participantCount: n, totalContributed: d, sumOfSquares: sumSq, maxContribution: maxC
        });
    }

    // --- concentrationBps / shareBps -------------------------------------

    function test_concentration_singleParticipant() public pure {
        // 單一參與者 c=1000：Σc²=1e6, D=1000, HHI = 1e6/1e6 = 100% = 10000bps
        assertEq(LaunchMath.concentrationBps(1_000_000, 1000), BPS);
    }

    function test_concentration_twoEqualParticipants() public pure {
        // 兩等額者 c=500 each：Σc²=2·250000=500000, D=1000, HHI = 5e5/1e6 = 50% = 5000bps
        assertEq(LaunchMath.concentrationBps(500_000, 1000), 5000);
    }

    function test_concentration_zeroDepositIsZero() public pure {
        assertEq(LaunchMath.concentrationBps(0, 0), 0);
    }

    function test_share_singleParticipant() public pure {
        // max=1000, D=1000 -> η=100%
        assertEq(LaunchMath.shareBps(1000, 1000), BPS);
    }

    function test_share_halfPool() public pure {
        // max=500, D=1000 -> η=50%
        assertEq(LaunchMath.shareBps(500, 1000), 5000);
    }

    function test_share_zeroDepositIsZero() public pure {
        assertEq(LaunchMath.shareBps(0, 0), 0);
    }

    // --- evaluate：全達標 / 各條件單獨失敗 --------------------------------

    function test_evaluate_allConditionsMet() public pure {
        // n=10>=5, D=1000>=500, 兩等額者 HHI=5000<=6000, η=5000<=6000
        ILaunch.LaunchStatus memory s = LaunchMath.evaluate(_config(5, 500, 6000, 6000), _state(10, 1000, 500_000, 500));
        assertTrue(s.meetsParticipants);
        assertTrue(s.meetsDeposit);
        assertTrue(s.meetsConcentration);
        assertTrue(s.meetsShare);
        assertTrue(s.canActivate);
        assertEq(s.concentrationBps, 5000);
        assertEq(s.shareBps, 5000);
    }

    function test_evaluate_failsOnParticipants() public pure {
        ILaunch.LaunchStatus memory s =
            LaunchMath.evaluate(_config(20, 500, 6000, 6000), _state(10, 1000, 500_000, 500));
        assertFalse(s.meetsParticipants);
        assertFalse(s.canActivate);
    }

    function test_evaluate_failsOnDeposit() public pure {
        ILaunch.LaunchStatus memory s =
            LaunchMath.evaluate(_config(5, 5000, 6000, 6000), _state(10, 1000, 500_000, 500));
        assertFalse(s.meetsDeposit);
        assertFalse(s.canActivate);
    }

    function test_evaluate_failsOnConcentration() public pure {
        // HHI=5000 但上限只有 4000 -> 不達標
        ILaunch.LaunchStatus memory s = LaunchMath.evaluate(_config(5, 500, 4000, 6000), _state(10, 1000, 500_000, 500));
        assertFalse(s.meetsConcentration);
        assertFalse(s.canActivate);
    }

    function test_evaluate_failsOnShare() public pure {
        // η=5000 但上限只有 4000 -> 不達標
        ILaunch.LaunchStatus memory s = LaunchMath.evaluate(_config(5, 500, 6000, 4000), _state(10, 1000, 500_000, 500));
        assertFalse(s.meetsShare);
        assertFalse(s.canActivate);
    }

    function test_evaluate_emptyPoolWithLenientConfig() public pure {
        // 空池 + 寬鬆門檻（全 0 / 上限 100%）-> 可啟動（本地 dev 路徑）
        ILaunch.LaunchStatus memory s = LaunchMath.evaluate(_config(0, 0, BPS, BPS), _state(0, 0, 0, 0));
        assertTrue(s.canActivate);
        assertEq(s.concentrationBps, 0);
        assertEq(s.shareBps, 0);
    }

    // --- fuzz：HHI 與 η 永遠 <= 100%，且 HHI <= η（單一占比上界） ----------

    function testFuzz_metricsBounded(uint256 d, uint256 maxC, uint256 sumSq) public pure {
        d = bound(d, 1, 1e30);
        maxC = bound(maxC, 0, d);
        // Σc² 的合法物理範圍：[maxC², maxC·D]（任一 c ≤ maxC ⇒ Σc² ≤ maxC·Σc = maxC·D）。
        sumSq = bound(sumSq, maxC * maxC, maxC * d);

        uint256 hhi = LaunchMath.concentrationBps(sumSq, d);
        uint256 eta = LaunchMath.shareBps(maxC, d);

        assertLe(hhi, BPS, "HHI <= 100%");
        assertLe(eta, BPS, "eta <= 100%");
        // Σc² <= D·maxC ⇒ HHI = Σc²/D² <= maxC/D = eta
        assertLe(hhi, eta, "HHI <= eta");
    }
}

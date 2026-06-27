// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { RateMath } from "../src/libraries/RateMath.sol";
import { IRate } from "../src/interfaces/IRate.sol";

/// @dev 將 internal library 包成 external，使 vm.expectRevert 能在外部呼叫深度攔截。
contract RateMathHarness {
    function credibilityZ(uint256 caseCount, uint256 fullThreshold) external pure returns (uint256) {
        return RateMath.credibilityZ(caseCount, fullThreshold);
    }

    function compute(IRate.RateInput memory input) external pure returns (IRate.RateResult memory) {
        return RateMath.compute(input);
    }
}

contract RateMathTest is Test {
    uint256 internal constant BPS = 10_000;

    RateMathHarness internal harness;

    function setUp() public {
        harness = new RateMathHarness();
    }

    function _input(
        uint256 caseCount,
        uint256 fullThreshold,
        uint256 pExp,
        uint256 pManual,
        uint256 sExp,
        uint256 sManual,
        uint256 cap
    ) internal pure returns (IRate.RateInput memory) {
        return IRate.RateInput({
            caseCount: caseCount,
            fullThreshold: fullThreshold,
            providerRExpBps: pExp,
            providerRManualBps: pManual,
            subscriberRExpBps: sExp,
            subscriberRManualBps: sManual,
            providerCapBps: cap
        });
    }

    // --- credibilityZ ----------------------------------------------------

    function test_z_proportionalBelowThreshold() public pure {
        // n=50, N_full=100 -> Z=5000bps
        assertEq(RateMath.credibilityZ(50, 100), 5000);
    }

    function test_z_zeroAtNoCases() public pure {
        assertEq(RateMath.credibilityZ(0, 100), 0);
    }

    function test_z_fullAtThreshold() public pure {
        assertEq(RateMath.credibilityZ(100, 100), BPS);
    }

    function test_z_cappedAboveThreshold() public pure {
        assertEq(RateMath.credibilityZ(500, 100), BPS);
    }

    function test_z_revertsOnZeroThreshold() public {
        vm.expectRevert(RateMath.ZeroThreshold.selector);
        harness.credibilityZ(10, 0);
    }

    // --- blendRate -------------------------------------------------------

    function test_blend_zZeroYieldsManual() public pure {
        // Z=0 -> A = R_manual
        assertEq(RateMath.blendRate(800, 200, 0), 200);
    }

    function test_blend_zFullYieldsExp() public pure {
        // Z=BPS -> A = R_exp
        assertEq(RateMath.blendRate(800, 200, BPS), 800);
    }

    function test_blend_halfIsAverage() public pure {
        // Z=5000bps -> A = (800 + 200)/2 = 500
        assertEq(RateMath.blendRate(800, 200, 5000), 500);
    }

    // --- compute ---------------------------------------------------------

    function test_compute_typical() public pure {
        // n=50/100 -> Z=5000
        // provider: blend(600,400,0.5)=500；subscriber: blend(300,100,0.5)=200
        // cap=10000 不綁；provider(500) >= subscriber(200)
        IRate.RateResult memory r = RateMath.compute(_input(50, 100, 600, 400, 300, 100, 10_000));
        assertEq(r.zBps, 5000);
        assertEq(r.providerRateBps, 500);
        assertEq(r.subscriberRateBps, 200);
    }

    function test_compute_providerCapBinds() public pure {
        // Z=BPS -> provider blend = 900；cap=600 夾到 600
        // subscriber blend = 500 <= 600，保持 500
        IRate.RateResult memory r = RateMath.compute(_input(100, 100, 900, 900, 500, 500, 600));
        assertEq(r.providerRateBps, 600, "provider capped");
        assertEq(r.subscriberRateBps, 500, "subscriber unchanged");
    }

    function test_compute_clampsInversion() public pure {
        // Z=BPS -> provider=300, subscriber=800（反轉）；subscriber 夾到 provider=300
        IRate.RateResult memory r = RateMath.compute(_input(100, 100, 300, 300, 800, 800, 10_000));
        assertEq(r.providerRateBps, 300);
        assertEq(r.subscriberRateBps, 300, "subscriber clamped down to provider");
    }

    function test_compute_capForcesEquality() public pure {
        // provider blend=900 夾到 cap=400；subscriber blend=700 > 400 -> 夾到 400
        IRate.RateResult memory r = RateMath.compute(_input(100, 100, 900, 900, 700, 700, 400));
        assertEq(r.providerRateBps, 400);
        assertEq(r.subscriberRateBps, 400);
    }

    // --- fuzz：不變量 ----------------------------------------------------

    function testFuzz_invariants(
        uint256 caseCount,
        uint256 fullThreshold,
        uint256 pExp,
        uint256 pManual,
        uint256 sExp,
        uint256 sManual,
        uint256 cap
    ) public pure {
        fullThreshold = bound(fullThreshold, 1, 1e6);
        caseCount = bound(caseCount, 0, 2e6);
        pExp = bound(pExp, 0, 5 * BPS);
        pManual = bound(pManual, 0, 5 * BPS);
        sExp = bound(sExp, 0, 5 * BPS);
        sManual = bound(sManual, 0, 5 * BPS);
        cap = bound(cap, 0, 5 * BPS);

        IRate.RateResult memory r =
            RateMath.compute(_input(caseCount, fullThreshold, pExp, pManual, sExp, sManual, cap));

        assertLe(r.zBps, BPS, "Z <= 100%");
        assertLe(r.providerRateBps, cap, "provider <= cap");
        assertGe(r.providerRateBps, r.subscriberRateBps, "provider >= subscriber");
    }
}

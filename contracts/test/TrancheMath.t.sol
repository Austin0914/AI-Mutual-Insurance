// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { TrancheMath } from "../src/libraries/TrancheMath.sol";
import { ITranche } from "../src/interfaces/ITranche.sol";

/// @dev 將 internal library 包成 external 呼叫，使 revert 發生於較低呼叫深度，
///      讓 vm.expectRevert 能正確攔截（Foundry 對 internal 呼叫的限制）。
contract TrancheMathHarness {
    function compute(ITranche.TrancheInput memory input) external pure returns (ITranche.TrancheResult memory) {
        return TrancheMath.compute(input);
    }
}

contract TrancheMathTest is Test {
    uint256 internal constant BPS = 10_000;

    TrancheMathHarness internal harness;

    function setUp() public {
        harness = new TrancheMathHarness();
    }

    function _input(uint256 loss, uint256 deductibleBps, uint256 coverageK, uint256 userContribution)
        internal
        pure
        returns (ITranche.TrancheInput memory)
    {
        return ITranche.TrancheInput({
            loss: loss, deductibleBps: deductibleBps, coverageK: coverageK, userContribution: userContribution
        });
    }

    // --- 單元測試 --------------------------------------------------------

    /// @notice 典型案例：d=20%、k=10、C_user 充足，共同池吃下扣除自負額後的全部損失
    function test_compute_typicalCase() public pure {
        // loss=1000, d=2000bps(20%), k=10, C_user=1000 -> cap=10000
        ITranche.TrancheResult memory r = TrancheMath.compute(_input(1000, 2000, 10, 1000));
        assertEq(r.deductible, 200, "deductible = 20% of 1000");
        assertEq(r.poolPayout, 800, "pool covers remainder under cap");
        assertEq(r.residual, 0, "no residual");
    }

    /// @notice 共同池上限夾住：cap = k * C_user 小於扣除自負額後的損失
    function test_compute_poolCapBinds() public pure {
        // loss=10000, d=2000bps -> deductible=2000, afterDeductible=8000
        // k=1, C_user=1000 -> cap=1000 < 8000 -> poolPayout=1000, residual=7000
        ITranche.TrancheResult memory r = TrancheMath.compute(_input(10_000, 2000, 1, 1000));
        assertEq(r.deductible, 2000, "deductible");
        assertEq(r.poolPayout, 1000, "pool payout capped at k * C_user");
        assertEq(r.residual, 7000, "residual to catastrophe/legal");
    }

    /// @notice 邊界：損失為 0，三層皆為 0
    function test_compute_zeroLoss() public pure {
        ITranche.TrancheResult memory r = TrancheMath.compute(_input(0, 2000, 10, 1000));
        assertEq(r.deductible, 0);
        assertEq(r.poolPayout, 0);
        assertEq(r.residual, 0);
    }

    /// @notice 邊界：自負額為 0，全部交給共同池
    function test_compute_zeroDeductible() public pure {
        ITranche.TrancheResult memory r = TrancheMath.compute(_input(1000, 0, 10, 1000));
        assertEq(r.deductible, 0, "no deductible");
        assertEq(r.poolPayout, 1000, "pool covers all under cap");
        assertEq(r.residual, 0);
    }

    /// @notice 邊界：自負額 100%，使用者自負全部，共同池不賠
    function test_compute_fullDeductible() public pure {
        ITranche.TrancheResult memory r = TrancheMath.compute(_input(1000, BPS, 10, 1000));
        assertEq(r.deductible, 1000, "deductible = full loss");
        assertEq(r.poolPayout, 0, "nothing left for pool");
        assertEq(r.residual, 0);
    }

    /// @notice 自負額比例超過 100% 應 revert
    function test_compute_revertsOnTooHighDeductible() public {
        vm.expectRevert(abi.encodeWithSelector(TrancheMath.DeductibleTooHigh.selector, BPS + 1));
        harness.compute(_input(1000, BPS + 1, 10, 1000));
    }

    // --- Fuzz：不變量 ----------------------------------------------------

    /// @notice 在任意有效輸入下，分層計算必須維持核心不變量
    function testFuzz_invariants(uint256 loss, uint256 deductibleBps, uint256 coverageK, uint256 userContribution)
        public
        pure
    {
        // 限制輸入範圍，避免 0.8 算術溢位 revert（屬預期保護，非本不變量測試對象）
        loss = bound(loss, 0, 1e30);
        deductibleBps = bound(deductibleBps, 0, BPS);
        coverageK = bound(coverageK, 0, 1e6);
        userContribution = bound(userContribution, 0, 1e30);

        ITranche.TrancheResult memory r = TrancheMath.compute(_input(loss, deductibleBps, coverageK, userContribution));

        // 不變量 1：自負額計算正確
        assertEq(r.deductible, (loss * deductibleBps) / BPS, "deductible formula");

        // 不變量 2：三層加總等於損失（償付能力守恆，無憑空賠付）
        assertEq(r.deductible + r.poolPayout + r.residual, loss, "tranches sum to loss");

        // 不變量 3：共同池賠付不超過上限 k * C_user（負債有界）
        assertLe(r.poolPayout, coverageK * userContribution, "pool payout within cap");

        // 不變量 4：共同池賠付不超過扣除自負額後的損失
        assertLe(r.poolPayout, loss - r.deductible, "pool payout within remaining loss");
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

import { FundVault } from "../src/core/FundVault.sol";
import { IFundVault } from "../src/interfaces/IFundVault.sol";
import { ILaunch } from "../src/interfaces/ILaunch.sol";
import { Roles } from "../src/access/Roles.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract FundVaultTest is Test {
    uint256 internal constant BPS = 10_000;

    MockERC20 internal token;
    FundVault internal vault;

    address internal admin = makeAddr("admin");
    address internal settler = makeAddr("settler");
    address internal subscriber = makeAddr("subscriber");
    address internal provider = makeAddr("provider");

    function setUp() public {
        token = new MockERC20("Mock USD", "mUSD");
        vault = new FundVault(token, admin, _lenientConfig());

        vm.startPrank(admin);
        vault.grantRole(Roles.SETTLER_ROLE, settler);
        vault.setActive(true);
        vm.stopPrank();
    }

    /// @dev 全寬鬆門檻：空池即可啟動（n_min=0、D_min=0、HHI_max=100%、η_max=100%）
    function _lenientConfig() internal pure returns (ILaunch.LaunchConfig memory) {
        return ILaunch.LaunchConfig({ nMin: 0, dMin: 0, hhiMaxBps: BPS, etaMaxBps: BPS });
    }

    function _config(uint256 nMin, uint256 dMin, uint256 hhiMaxBps, uint256 etaMaxBps)
        internal
        pure
        returns (ILaunch.LaunchConfig memory)
    {
        return ILaunch.LaunchConfig({ nMin: nMin, dMin: dMin, hhiMaxBps: hhiMaxBps, etaMaxBps: etaMaxBps });
    }

    /// @dev 以指定門檻部署一個尚未啟動的新 vault（admin 同前）
    function _deploy(ILaunch.LaunchConfig memory cfg) internal returns (FundVault v) {
        v = new FundVault(token, admin, cfg);
    }

    /// @dev 對指定 vault 鑄幣、授權並注資
    function _contributeTo(FundVault v, address who, IFundVault.ParticipantType pType, uint256 amount) internal {
        token.mint(who, amount);
        vm.startPrank(who);
        token.approve(address(v), amount);
        v.contribute(pType, amount);
        vm.stopPrank();
    }

    /// @dev 鑄幣、授權並以指定類型注資
    function _contribute(address who, IFundVault.ParticipantType pType, uint256 amount) internal {
        token.mint(who, amount);
        vm.startPrank(who);
        token.approve(address(vault), amount);
        vault.contribute(pType, amount);
        vm.stopPrank();
    }

    // --- 注資 ------------------------------------------------------------

    function test_contribute_updatesAccounting() public {
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 1000);

        assertEq(vault.contributionOf(subscriber), 1000, "C_user");
        assertEq(vault.totalContributed(), 1000, "totalContributed");
        assertEq(vault.poolBalance(), 1000, "poolBalance");
        assertEq(token.balanceOf(address(vault)), 1000, "vault token balance");
        assertEq(uint8(vault.participantTypeOf(subscriber)), uint8(IFundVault.ParticipantType.Subscriber));
    }

    function test_contribute_accumulates() public {
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 1000);
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 500);
        assertEq(vault.contributionOf(subscriber), 1500);
        assertEq(vault.poolBalance(), 1500);
    }

    function test_contribute_revertsOnZero() public {
        vm.prank(subscriber);
        vm.expectRevert(FundVault.ZeroAmount.selector);
        vault.contribute(IFundVault.ParticipantType.Subscriber, 0);
    }

    function test_contribute_revertsOnUnsetType() public {
        token.mint(subscriber, 100);
        vm.startPrank(subscriber);
        token.approve(address(vault), 100);
        vm.expectRevert(FundVault.InvalidParticipantType.selector);
        vault.contribute(IFundVault.ParticipantType.Unset, 100);
        vm.stopPrank();
    }

    function test_contribute_revertsOnTypeMismatch() public {
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 100);
        token.mint(subscriber, 100);
        vm.startPrank(subscriber);
        token.approve(address(vault), 100);
        vm.expectRevert(FundVault.ParticipantTypeMismatch.selector);
        vault.contribute(IFundVault.ParticipantType.Provider, 100);
        vm.stopPrank();
    }

    // --- 結算 ------------------------------------------------------------

    function test_settle_typicalCase() public {
        // C_user 充足，共同池吃下扣除自負額後的全部損失
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 1000);
        _contribute(provider, IFundVault.ParticipantType.Provider, 5000);

        // loss=1000, d=20%, k=10 -> deductible=200, poolPayout=800
        vm.prank(settler);
        vault.settle(subscriber, 1000, 2000, 10);

        assertEq(token.balanceOf(subscriber), 800, "subscriber receives poolPayout only (no deductible)");
        assertEq(vault.totalPaidOut(), 800);
        assertEq(vault.poolBalance(), 6000 - 800, "pool decreased by payout");
    }

    function test_settle_clampsToPoolBalance() public {
        // 池餘額不足以支付 poolPayout，支付被夾住，差額併入殘額
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 1000);
        // 池中只有 1000；loss=10000, d=0, k=100 -> poolPayout 想要 10000，但只剩 1000
        vm.expectEmit(true, false, false, true, address(vault));
        emit IFundVault.Settled(subscriber, 10_000, 0, 1000, 9000);
        vm.prank(settler);
        vault.settle(subscriber, 10_000, 0, 100);

        assertEq(token.balanceOf(subscriber), 1000, "paid up to available balance");
        assertEq(vault.poolBalance(), 0, "pool drained but never negative");
    }

    function test_settle_revertsForNonSettler() public {
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 1000);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), Roles.SETTLER_ROLE
            )
        );
        vault.settle(subscriber, 1000, 2000, 10);
    }

    function test_settle_revertsWhenNotActive() public {
        vm.prank(admin);
        vault.setActive(false);
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 1000);
        vm.prank(settler);
        vm.expectRevert(FundVault.NotActive.selector);
        vault.settle(subscriber, 1000, 2000, 10);
    }

    function test_settle_revertsForNonSubscriber() public {
        _contribute(provider, IFundVault.ParticipantType.Provider, 1000);
        vm.prank(settler);
        vm.expectRevert(abi.encodeWithSelector(FundVault.NotSubscriber.selector, provider));
        vault.settle(provider, 1000, 2000, 10);
    }

    // --- 權限 ------------------------------------------------------------

    function test_setActive_onlyAdmin() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), vault.DEFAULT_ADMIN_ROLE()
            )
        );
        vault.setActive(false);
    }

    // --- 啟動門檻 ------------------------------------------------------

    function test_contribute_tracksParticipantCount() public {
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 300);
        _contribute(provider, IFundVault.ParticipantType.Provider, 100);
        assertEq(vault.participantCount(), 2, "two distinct participants");
        // 同一人再注資不重複計數
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 200);
        assertEq(vault.participantCount(), 2, "count unchanged on repeat contributor");
    }

    function test_contribute_tracksSumOfSquaresAndMax() public {
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 300);
        _contribute(provider, IFundVault.ParticipantType.Provider, 100);
        assertEq(vault.sumOfSquares(), 300 * 300 + 100 * 100, "sumOfSquares after two");
        assertEq(vault.maxContribution(), 300, "max is 300");
        // subscriber 累加到 500，平方和與 max 隨之更新
        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, 200);
        assertEq(vault.sumOfSquares(), 500 * 500 + 100 * 100, "sumOfSquares after accumulation");
        assertEq(vault.maxContribution(), 500, "max updated to 500");
    }

    function test_activate_succeedsWhenThresholdMet() public {
        // n_min=2, D_min=500；寬鬆集中度 / 占比上限
        FundVault v = _deploy(_config(2, 500, BPS, BPS));
        _contributeTo(v, subscriber, IFundVault.ParticipantType.Subscriber, 300);
        _contributeTo(v, provider, IFundVault.ParticipantType.Provider, 300);
        assertTrue(v.canActivate(), "thresholds met");

        vm.expectEmit(false, false, false, true, address(v));
        emit IFundVault.ActiveStatusChanged(true);
        v.activate();
        assertTrue(v.active(), "fund activated");
    }

    function test_activate_revertsWhenParticipantsBelowMin() public {
        FundVault v = _deploy(_config(3, 0, BPS, BPS));
        _contributeTo(v, subscriber, IFundVault.ParticipantType.Subscriber, 1000);
        assertFalse(v.canActivate());
        vm.expectRevert(FundVault.LaunchThresholdNotMet.selector);
        v.activate();
    }

    function test_activate_revertsWhenConcentrationTooHigh() public {
        // 單一參與者 -> HHI=100%，上限 5000bps -> 不可啟動
        FundVault v = _deploy(_config(1, 0, 5000, BPS));
        _contributeTo(v, subscriber, IFundVault.ParticipantType.Subscriber, 1000);
        vm.expectRevert(FundVault.LaunchThresholdNotMet.selector);
        v.activate();
    }

    function test_activate_revertsWhenShareTooHigh() public {
        // 兩參與者 700/300 -> η=70%，上限 5000bps -> 不可啟動（集中度上限放寬）
        FundVault v = _deploy(_config(2, 0, BPS, 5000));
        _contributeTo(v, subscriber, IFundVault.ParticipantType.Subscriber, 700);
        _contributeTo(v, provider, IFundVault.ParticipantType.Provider, 300);
        vm.expectRevert(FundVault.LaunchThresholdNotMet.selector);
        v.activate();
    }

    function test_activate_isOneWayLatch() public {
        // η_max=5000bps；空池可啟動，之後單一大額注資使 η 超標，active 仍不回退
        FundVault v = _deploy(_config(0, 0, BPS, 5000));
        v.activate();
        assertTrue(v.active());

        _contributeTo(v, subscriber, IFundVault.ParticipantType.Subscriber, 1_000_000);
        assertFalse(v.canActivate(), "would no longer pass threshold");
        assertTrue(v.active(), "but stays active (latch)");
        // 再次呼叫 activate 不 revert、冪等
        v.activate();
        assertTrue(v.active());
    }

    function test_setLaunchConfig_onlyAdminAndUpdates() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), vault.DEFAULT_ADMIN_ROLE()
            )
        );
        vault.setLaunchConfig(_config(7, 8, 9, 10));

        vm.prank(admin);
        vm.expectEmit(false, false, false, true, address(vault));
        emit IFundVault.LaunchConfigUpdated(7, 8, 9, 10);
        vault.setLaunchConfig(_config(7, 8, 9, 10));

        (uint256 nMin, uint256 dMin, uint256 hhiMaxBps, uint256 etaMaxBps) = vault.launchConfig();
        assertEq(nMin, 7);
        assertEq(dMin, 8);
        assertEq(hhiMaxBps, 9);
        assertEq(etaMaxBps, 10);
    }

    function test_setActive_emergencyOverrideForcesActive() public {
        // 全新 vault 門檻未達，但 admin 可緊急覆寫啟動
        FundVault v = _deploy(_config(100, 0, BPS, BPS));
        assertFalse(v.canActivate());
        vm.prank(admin);
        v.setActive(true);
        assertTrue(v.active(), "admin override bypasses threshold");
    }

    // --- Fuzz：償付能力不變量 --------------------------------------------

    function testFuzz_solvencyInvariant(
        uint256 subAmount,
        uint256 provAmount,
        uint256 loss,
        uint256 deductibleBps,
        uint256 coverageK
    ) public {
        subAmount = bound(subAmount, 1, 1e27);
        provAmount = bound(provAmount, 0, 1e27);
        loss = bound(loss, 0, 1e30);
        deductibleBps = bound(deductibleBps, 0, BPS);
        coverageK = bound(coverageK, 0, 1e6);

        _contribute(subscriber, IFundVault.ParticipantType.Subscriber, subAmount);
        if (provAmount > 0) {
            _contribute(provider, IFundVault.ParticipantType.Provider, provAmount);
        }

        vm.prank(settler);
        vault.settle(subscriber, loss, deductibleBps, coverageK);

        // 不變量：池餘額守恆且永不為負
        assertEq(vault.poolBalance(), vault.totalContributed() - vault.totalPaidOut(), "pool balance conservation");
        assertLe(vault.totalPaidOut(), vault.totalContributed(), "never pays more than contributed");
        // 不變量：合約實際持幣 == 池餘額（自負額不由池支付）
        assertEq(token.balanceOf(address(vault)), vault.poolBalance(), "token balance matches pool");
    }
}

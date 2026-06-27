// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

import { AssessorRegistry } from "../src/core/AssessorRegistry.sol";

contract AssessorRegistryTest is Test {
    AssessorRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal a = makeAddr("a");
    address internal b = makeAddr("b");
    address internal c = makeAddr("c");

    function setUp() public {
        registry = new AssessorRegistry(admin);
    }

    function _register(address who, uint256 stake) internal {
        vm.prank(admin);
        registry.registerAssessor(who, stake);
    }

    function test_register_updatesState() public {
        _register(a, 100);
        assertTrue(registry.isAssessor(a));
        assertEq(registry.stakeOf(a), 100);
        assertEq(registry.assessorCount(), 1);
        assertEq(registry.assessorAt(0), a);
    }

    function test_register_revertsOnZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(AssessorRegistry.ZeroAddress.selector);
        registry.registerAssessor(address(0), 100);
    }

    function test_register_revertsOnZeroStake() public {
        vm.prank(admin);
        vm.expectRevert(AssessorRegistry.ZeroStake.selector);
        registry.registerAssessor(a, 0);
    }

    function test_register_revertsOnDuplicate() public {
        _register(a, 100);
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AssessorRegistry.AlreadyRegistered.selector, a));
        registry.registerAssessor(a, 200);
    }

    function test_register_revertsForNonRegistrar() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), registry.REGISTRAR_ROLE()
            )
        );
        registry.registerAssessor(a, 100);
    }

    function test_updateStake() public {
        _register(a, 100);
        vm.prank(admin);
        registry.updateStake(a, 250);
        assertEq(registry.stakeOf(a), 250);
    }

    function test_updateStake_revertsIfNotRegistered() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AssessorRegistry.NotRegistered.selector, a));
        registry.updateStake(a, 250);
    }

    function test_deregister_swapAndPop() public {
        _register(a, 100);
        _register(b, 100);
        _register(c, 100);

        vm.prank(admin);
        registry.deregisterAssessor(b);

        assertFalse(registry.isAssessor(b));
        assertEq(registry.assessorCount(), 2);
        // c 被搬到原 b 的位置（index 1）
        assertEq(registry.assessorAt(1), c);
        assertEq(registry.stakeOf(b), 0);
    }

    function test_deregister_revertsIfNotRegistered() public {
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(AssessorRegistry.NotRegistered.selector, a));
        registry.deregisterAssessor(a);
    }

    function _grantSlasher(address who) internal {
        bytes32 role = registry.SLASHER_ROLE();
        vm.prank(admin);
        registry.grantRole(role, who);
    }

    function test_slash_partialReducesStake() public {
        _register(a, 100);
        _grantSlasher(address(this));

        registry.slash(a, 30);

        assertEq(registry.stakeOf(a), 70);
        assertTrue(registry.isAssessor(a));
        assertEq(registry.totalSlashed(), 30);
        assertEq(registry.assessorCount(), 1);
    }

    function test_slash_toZeroDeregisters() public {
        _register(a, 100);
        _register(b, 100);
        _grantSlasher(address(this));

        registry.slash(a, 100);

        assertFalse(registry.isAssessor(a));
        assertEq(registry.stakeOf(a), 0);
        assertEq(registry.assessorCount(), 1);
        assertEq(registry.totalSlashed(), 100);
        // b 被搬到 index 0
        assertEq(registry.assessorAt(0), b);
    }

    function test_slash_clampsToStake() public {
        _register(a, 100);
        _grantSlasher(address(this));

        registry.slash(a, 250);

        assertFalse(registry.isAssessor(a));
        // 只罰沒實際持有量
        assertEq(registry.totalSlashed(), 100);
    }

    function test_slash_accumulatesTotal() public {
        _register(a, 100);
        _register(b, 100);
        _grantSlasher(address(this));

        registry.slash(a, 30);
        registry.slash(b, 40);

        assertEq(registry.totalSlashed(), 70);
    }

    function test_slash_revertsForNonSlasher() public {
        _register(a, 100);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), registry.SLASHER_ROLE()
            )
        );
        registry.slash(a, 10);
    }

    function test_slash_revertsIfNotRegistered() public {
        _grantSlasher(address(this));
        vm.expectRevert(abi.encodeWithSelector(AssessorRegistry.NotRegistered.selector, a));
        registry.slash(a, 10);
    }
}

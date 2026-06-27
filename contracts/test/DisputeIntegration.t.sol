// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";

import { DisputeManager } from "../src/core/DisputeManager.sol";
import { AssessorRegistry } from "../src/core/AssessorRegistry.sol";
import { FundVault } from "../src/core/FundVault.sol";
import { IFundVault } from "../src/interfaces/IFundVault.sol";
import { ILaunch } from "../src/interfaces/ILaunch.sol";
import { Roles } from "../src/access/Roles.sol";
import { MockRandomnessProvider } from "./mocks/MockRandomnessProvider.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

/// @notice 端到端整合：DisputeManager 投票判定後實際驅動 FundVault 結算。
contract DisputeIntegrationTest is Test {
    MockERC20 internal token;
    FundVault internal vault;
    AssessorRegistry internal registry;
    MockRandomnessProvider internal randomness;
    DisputeManager internal dm;

    address internal admin = makeAddr("admin");
    address internal subscriber = makeAddr("subscriber");

    uint256 internal constant POOL_SIZE = 5;
    uint256 internal constant STAKE = 100;
    uint32 internal constant N = 3;
    uint64 internal constant COMMIT_DUR = 1 hours;
    uint64 internal constant REVEAL_DUR = 1 hours;

    uint256 internal constant CONTRIBUTION = 10_000;
    uint256 internal constant LOSS = 1000;
    uint256 internal constant DEDUCTIBLE_BPS = 2000; // 20%
    uint256 internal constant COVERAGE_K = 10;

    function setUp() public {
        token = new MockERC20("Mock USD", "mUSD");
        vault = new FundVault(
            token, admin, ILaunch.LaunchConfig({ nMin: 0, dMin: 0, hhiMaxBps: 10_000, etaMaxBps: 10_000 })
        );
        registry = new AssessorRegistry(admin);
        randomness = new MockRandomnessProvider();
        dm = new DisputeManager(admin, registry, randomness, vault);
        randomness.setConsumer(dm);

        vm.startPrank(admin);
        vault.grantRole(Roles.SETTLER_ROLE, address(dm)); // DisputeManager 取代佔位結算者
        registry.grantRole(registry.SLASHER_ROLE(), address(dm));
        vault.setActive(true);
        for (uint256 i = 0; i < POOL_SIZE; i++) {
            registry.registerAssessor(makeAddr(string(abi.encodePacked("assessor", i))), STAKE);
        }
        vm.stopPrank();

        // subscriber 注資以建立共同池與 C_user
        token.mint(subscriber, CONTRIBUTION);
        vm.startPrank(subscriber);
        token.approve(address(vault), CONTRIBUTION);
        vault.contribute(IFundVault.ParticipantType.Subscriber, CONTRIBUTION);
        vm.stopPrank();
    }

    function _salt(uint256 i) internal pure returns (bytes32) {
        return keccak256(abi.encode("salt", i));
    }

    function _driveCaseToSettlement(uint256 caseId) internal {
        vm.prank(admin);
        dm.requestAssessors(caseId, N);
        randomness.fulfillWithSeed(1, 0xBEEF);
        vm.prank(admin);
        dm.startVoting(caseId, COMMIT_DUR, REVEAL_DUR, 5000, 0);

        address[] memory assigned = dm.getAssignedAssessors(caseId);
        uint256[3] memory ratios = [uint256(2000), 5000, 8000]; // 中位數 5000

        for (uint256 i = 0; i < N; i++) {
            vm.prank(assigned[i]);
            dm.commitVote(caseId, keccak256(abi.encode(ratios[i], _salt(i), caseId)));
        }

        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        for (uint256 i = 0; i < N; i++) {
            vm.prank(assigned[i]);
            dm.revealVote(caseId, ratios[i], _salt(i));
        }

        vm.warp(c.revealDeadline + 1);

        // effectiveLoss = 1000 * 5000/10000 = 500
        // deductible = 500 * 2000/10000 = 100；afterDeductible = 400
        // cap = k * C_user = 10 * 10000 遠大於 400 → poolPayout = 400
        vm.expectEmit(true, false, false, true, address(vault));
        emit IFundVault.Settled(subscriber, 500, 100, 400, 0);
        dm.resolve(caseId);

        assertEq(vault.poolBalance(), CONTRIBUTION - 400);
        assertEq(vault.totalPaidOut(), 400);
        assertEq(token.balanceOf(subscriber), 400);
    }

    function test_endToEnd_resolveTriggersSettlement() public {
        vm.prank(admin);
        uint256 caseId = dm.openDispute(subscriber, LOSS, DEDUCTIBLE_BPS, COVERAGE_K, keccak256("evidence"));

        _driveCaseToSettlement(caseId);
    }

    function test_endToEnd_subscriberSelfOpenResolveTriggersSettlement() public {
        vm.prank(subscriber);
        uint256 caseId = dm.openDisputeForSelf(LOSS, DEDUCTIBLE_BPS, COVERAGE_K, keccak256("evidence"));

        _driveCaseToSettlement(caseId);
    }
}

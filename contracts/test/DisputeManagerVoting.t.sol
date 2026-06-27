// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";

import { DisputeManager } from "../src/core/DisputeManager.sol";
import { AssessorRegistry } from "../src/core/AssessorRegistry.sol";
import { MockRandomnessProvider } from "./mocks/MockRandomnessProvider.sol";
import { MockFundVault } from "./mocks/MockFundVault.sol";

contract DisputeManagerVotingTest is Test {
    AssessorRegistry internal registry;
    MockRandomnessProvider internal randomness;
    MockFundVault internal vault;
    DisputeManager internal dm;

    address internal admin = makeAddr("admin");
    address internal subscriber = makeAddr("subscriber");
    address internal outsider = makeAddr("outsider");

    uint256 internal constant POOL_SIZE = 5;
    uint256 internal constant STAKE = 100;
    uint32 internal constant N = 3;
    uint64 internal constant COMMIT_DUR = 1 hours;
    uint64 internal constant REVEAL_DUR = 1 hours;

    uint256 internal constant LOSS = 1000;
    uint256 internal constant DEDUCTIBLE_BPS = 2000;
    uint256 internal constant COVERAGE_K = 10;

    function setUp() public {
        registry = new AssessorRegistry(admin);
        randomness = new MockRandomnessProvider();
        vault = new MockFundVault();
        dm = new DisputeManager(admin, registry, randomness, vault);
        randomness.setConsumer(dm);

        vm.startPrank(admin);
        registry.grantRole(registry.SLASHER_ROLE(), address(dm));
        for (uint256 i = 0; i < POOL_SIZE; i++) {
            registry.registerAssessor(makeAddr(string(abi.encodePacked("assessor", i))), STAKE);
        }
        vm.stopPrank();
    }

    // --- helpers ---------------------------------------------------------

    /// @dev 開案 → 請求 N 名 → 以種子分派，回傳分派名單
    function _openAssignAndStart(uint256 quorumBps) internal returns (uint256 caseId, address[] memory assigned) {
        return _openAssignAndStart(quorumBps, 0);
    }

    /// @dev 同上，但可指定缺席罰沒比例
    function _openAssignAndStart(uint256 quorumBps, uint256 slashBps)
        internal
        returns (uint256 caseId, address[] memory assigned)
    {
        vm.prank(admin);
        caseId = dm.openDispute(subscriber, LOSS, DEDUCTIBLE_BPS, COVERAGE_K, keccak256("evidence"));

        vm.prank(admin);
        dm.requestAssessors(caseId, N);
        randomness.fulfillWithSeed(1, 0xBEEF);

        vm.prank(admin);
        dm.startVoting(caseId, COMMIT_DUR, REVEAL_DUR, quorumBps, slashBps);

        assigned = dm.getAssignedAssessors(caseId);
    }

    function _salt(uint256 i) internal pure returns (bytes32) {
        return keccak256(abi.encode("salt", i));
    }

    function _commitment(uint256 caseId, uint256 ratio, bytes32 salt) internal pure returns (bytes32) {
        return keccak256(abi.encode(ratio, salt, caseId));
    }

    // --- 完整流程：加權中位數驅動結算 ------------------------------------

    function test_fullFlow_settlesWithMedian() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000);

        uint256[3] memory ratios = [uint256(2000), 5000, 8000];

        // commit 階段
        for (uint256 i = 0; i < N; i++) {
            vm.prank(assigned[i]);
            dm.commitVote(caseId, _commitment(caseId, ratios[i], _salt(i)));
        }

        // 進入 reveal 期
        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        for (uint256 i = 0; i < N; i++) {
            vm.prank(assigned[i]);
            dm.revealVote(caseId, ratios[i], _salt(i));
            assertTrue(dm.hasRevealed(caseId, assigned[i]));
        }

        // reveal 期後結算
        vm.warp(c.revealDeadline + 1);
        dm.resolve(caseId);

        // 等權三票 [2000,5000,8000] → 中位數 5000；effectiveLoss = 1000*5000/10000 = 500
        assertEq(vault.settleCount(), 1);
        assertEq(vault.lastSubscriber(), subscriber);
        assertEq(vault.lastLoss(), 500);
        assertEq(vault.lastDeductibleBps(), DEDUCTIBLE_BPS);
        assertEq(vault.lastCoverageK(), COVERAGE_K);
        assertEq(uint8(dm.getCase(caseId).status), uint8(DisputeManager.CaseStatus.Resolved));
    }

    // --- 未達 quorum：結案不賠付 ----------------------------------------

    function test_resolve_belowQuorum_noSettle() public {
        // 門檻 6700bps（>2/3 權重）；只有 1/3 揭露 → 不達標
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(6700);

        uint256 ratio = 5000;
        vm.prank(assigned[0]);
        dm.commitVote(caseId, _commitment(caseId, ratio, _salt(0)));

        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        vm.prank(assigned[0]);
        dm.revealVote(caseId, ratio, _salt(0));

        vm.warp(c.revealDeadline + 1);
        vm.expectEmit(true, false, false, true, address(dm));
        emit DisputeManager.CaseResolved(caseId, false, 0, 0);
        dm.resolve(caseId);

        assertEq(vault.settleCount(), 0);
        assertEq(uint8(dm.getCase(caseId).status), uint8(DisputeManager.CaseStatus.Resolved));
    }

    // --- 缺席記錄 --------------------------------------------------------

    function test_resolve_recordsNoShow() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000);

        // 只讓前兩名 commit + reveal，第三名缺席（仍達 2/3 > 50% quorum）
        uint256[2] memory ratios = [uint256(4000), 6000];
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(assigned[i]);
            dm.commitVote(caseId, _commitment(caseId, ratios[i], _salt(i)));
        }
        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(assigned[i]);
            dm.revealVote(caseId, ratios[i], _salt(i));
        }

        vm.warp(c.revealDeadline + 1);
        vm.expectEmit(true, true, false, false, address(dm));
        emit DisputeManager.AssessorNoShow(caseId, assigned[2]);
        dm.resolve(caseId);

        assertEq(vault.settleCount(), 1);
    }

    // --- 缺席罰沒 --------------------------------------------------------

    function test_resolve_slashesNoShow() public {
        // slashBps = 5000：缺席者罰沒一半快照權重
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000, 5000);

        uint256[2] memory ratios = [uint256(4000), 6000];
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(assigned[i]);
            dm.commitVote(caseId, _commitment(caseId, ratios[i], _salt(i)));
        }
        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(assigned[i]);
            dm.revealVote(caseId, ratios[i], _salt(i));
        }

        address noShow = assigned[2];
        uint256 weight = dm.weightOf(caseId, noShow);

        vm.warp(c.revealDeadline + 1);
        dm.resolve(caseId);

        // 快照權重 = STAKE = 100；罰沒 50% → 剩 50
        assertEq(weight, STAKE);
        assertEq(registry.stakeOf(noShow), STAKE - (STAKE * 5000) / 10_000);
        assertEq(registry.totalSlashed(), (STAKE * 5000) / 10_000);
        // 出席者未被罰
        assertEq(registry.stakeOf(assigned[0]), STAKE);
        assertEq(registry.stakeOf(assigned[1]), STAKE);
    }

    function test_resolve_noSlashWhenSlashBpsZero() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000, 0);

        uint256[2] memory ratios = [uint256(4000), 6000];
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(assigned[i]);
            dm.commitVote(caseId, _commitment(caseId, ratios[i], _salt(i)));
        }
        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        for (uint256 i = 0; i < 2; i++) {
            vm.prank(assigned[i]);
            dm.revealVote(caseId, ratios[i], _salt(i));
        }

        vm.warp(c.revealDeadline + 1);
        dm.resolve(caseId);

        assertEq(registry.stakeOf(assigned[2]), STAKE);
        assertEq(registry.totalSlashed(), 0);
    }

    function test_startVoting_revertsOnBadSlash() public {
        (uint256 caseId,) = _setupAssigned();
        vm.prank(admin);
        vm.expectRevert(DisputeManager.InvalidSlash.selector);
        dm.startVoting(caseId, COMMIT_DUR, REVEAL_DUR, 5000, 10_001);
    }

    // --- reveal 驗證 -----------------------------------------------------

    function test_revealVote_revertsOnMismatch() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000);

        vm.prank(assigned[0]);
        dm.commitVote(caseId, _commitment(caseId, 5000, _salt(0)));

        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        vm.prank(assigned[0]);
        vm.expectRevert(DisputeManager.CommitmentMismatch.selector);
        dm.revealVote(caseId, 6000, _salt(0)); // 比例與 commit 不符
    }

    function test_revealVote_revertsOnRatioOutOfRange() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000);
        vm.prank(assigned[0]);
        dm.commitVote(caseId, _commitment(caseId, 5000, _salt(0)));
        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        vm.prank(assigned[0]);
        vm.expectRevert(DisputeManager.RatioOutOfRange.selector);
        dm.revealVote(caseId, 10_001, _salt(0));
    }

    function test_revealVote_revertsBeforeWindow() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000);
        vm.prank(assigned[0]);
        dm.commitVote(caseId, _commitment(caseId, 5000, _salt(0)));
        // 尚在 commit 期，不能 reveal
        vm.prank(assigned[0]);
        vm.expectRevert(DisputeManager.NotInRevealWindow.selector);
        dm.revealVote(caseId, 5000, _salt(0));
    }

    // --- commit 驗證 -----------------------------------------------------

    function test_commitVote_revertsForNonAssigned() public {
        (uint256 caseId,) = _openAssignAndStart(5000);
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(DisputeManager.NotAssignedAssessor.selector, caseId, outsider));
        dm.commitVote(caseId, _commitment(caseId, 5000, _salt(0)));
    }

    function test_commitVote_revertsOnDouble() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000);
        vm.startPrank(assigned[0]);
        dm.commitVote(caseId, _commitment(caseId, 5000, _salt(0)));
        vm.expectRevert(DisputeManager.AlreadyCommitted.selector);
        dm.commitVote(caseId, _commitment(caseId, 5000, _salt(0)));
        vm.stopPrank();
    }

    function test_commitVote_revertsAfterWindow() public {
        (uint256 caseId, address[] memory assigned) = _openAssignAndStart(5000);
        DisputeManager.Case memory c = dm.getCase(caseId);
        vm.warp(c.commitDeadline + 1);
        vm.prank(assigned[0]);
        vm.expectRevert(DisputeManager.NotInCommitWindow.selector);
        dm.commitVote(caseId, _commitment(caseId, 5000, _salt(0)));
    }

    // --- 狀態機 ----------------------------------------------------------

    function test_startVoting_revertsWrongStatus() public {
        vm.startPrank(admin);
        uint256 caseId = dm.openDispute(subscriber, LOSS, DEDUCTIBLE_BPS, COVERAGE_K, keccak256("e"));
        // 尚未分派，不能 startVoting
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeManager.InvalidCaseStatus.selector,
                caseId,
                DisputeManager.CaseStatus.Assigned,
                DisputeManager.CaseStatus.Evidence
            )
        );
        dm.startVoting(caseId, COMMIT_DUR, REVEAL_DUR, 5000, 0);
        vm.stopPrank();
    }

    function test_startVoting_revertsOnBadQuorum() public {
        (uint256 caseId,) = _setupAssigned();
        vm.prank(admin);
        vm.expectRevert(DisputeManager.InvalidQuorum.selector);
        dm.startVoting(caseId, COMMIT_DUR, REVEAL_DUR, 10_001, 0);
    }

    function test_resolve_revertsBeforeRevealClose() public {
        (uint256 caseId,) = _openAssignAndStart(5000);
        vm.expectRevert(DisputeManager.RevealWindowNotClosed.selector);
        dm.resolve(caseId);
    }

    function _setupAssigned() internal returns (uint256 caseId, address[] memory assigned) {
        vm.prank(admin);
        caseId = dm.openDispute(subscriber, LOSS, DEDUCTIBLE_BPS, COVERAGE_K, keccak256("evidence"));
        vm.prank(admin);
        dm.requestAssessors(caseId, N);
        randomness.fulfillWithSeed(1, 0xBEEF);
        assigned = dm.getAssignedAssessors(caseId);
    }
}

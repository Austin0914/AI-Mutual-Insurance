// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { IAccessControl } from "@openzeppelin/contracts/access/IAccessControl.sol";

import { DisputeManager } from "../src/core/DisputeManager.sol";
import { AssessorRegistry } from "../src/core/AssessorRegistry.sol";
import { IFundVault } from "../src/interfaces/IFundVault.sol";
import { MockRandomnessProvider } from "./mocks/MockRandomnessProvider.sol";
import { MockFundVault } from "./mocks/MockFundVault.sol";

contract DisputeManagerTest is Test {
    AssessorRegistry internal registry;
    MockRandomnessProvider internal randomness;
    MockFundVault internal vault;
    DisputeManager internal dm;

    address internal admin = makeAddr("admin");
    address internal subscriber = makeAddr("subscriber");
    address internal provider = makeAddr("provider");
    address internal unfundedSubscriber = makeAddr("unfundedSubscriber");
    address internal outsider = makeAddr("outsider");

    uint256 internal constant POOL_SIZE = 5;
    uint256 internal constant SUBSCRIBER_CONTRIBUTION = 1_000;

    function setUp() public {
        registry = new AssessorRegistry(admin);
        randomness = new MockRandomnessProvider();
        vault = new MockFundVault();
        dm = new DisputeManager(admin, registry, randomness, vault);
        randomness.setConsumer(dm);

        vault.setParticipant(subscriber, IFundVault.ParticipantType.Subscriber, SUBSCRIBER_CONTRIBUTION);
        vault.setParticipant(provider, IFundVault.ParticipantType.Provider, SUBSCRIBER_CONTRIBUTION);
        vault.setParticipant(unfundedSubscriber, IFundVault.ParticipantType.Subscriber, 0);

        // 註冊 5 名鑑定者
        vm.startPrank(admin);
        for (uint256 i = 0; i < POOL_SIZE; i++) {
            registry.registerAssessor(makeAddr(string(abi.encodePacked("assessor", i))), 100 + i);
        }
        vm.stopPrank();
    }

    function _open() internal returns (uint256 caseId) {
        vm.prank(admin);
        caseId = dm.openDispute(subscriber, 1000, 2000, 10, keccak256("evidence"));
    }

    // --- 開案 ------------------------------------------------------------

    function test_openDispute_createsCase() public {
        uint256 caseId = _open();
        DisputeManager.Case memory c = dm.getCase(caseId);
        assertEq(c.subscriber, subscriber);
        assertEq(uint8(c.status), uint8(DisputeManager.CaseStatus.Evidence));
        assertEq(dm.nextCaseId(), 1);
    }

    function test_openDisputeForSelf_subscriberCreatesOwnCase() public {
        vm.prank(subscriber);
        uint256 caseId = dm.openDisputeForSelf(1000, 2000, 10, keccak256("evidence"));

        DisputeManager.Case memory c = dm.getCase(caseId);
        assertEq(c.subscriber, subscriber);
        assertEq(c.loss, 1000);
        assertEq(uint8(c.status), uint8(DisputeManager.CaseStatus.Evidence));
        assertEq(dm.nextCaseId(), 1);
    }

    function test_openDisputeForSelf_revertsForNonSubscribers() public {
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(DisputeManager.NotSubscriber.selector, provider));
        dm.openDisputeForSelf(1000, 2000, 10, keccak256("evidence"));

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(DisputeManager.NotSubscriber.selector, outsider));
        dm.openDisputeForSelf(1000, 2000, 10, keccak256("evidence"));
    }

    function test_openDisputeForSelf_revertsForSubscriberWithoutContribution() public {
        vm.prank(unfundedSubscriber);
        vm.expectRevert(abi.encodeWithSelector(DisputeManager.NoContribution.selector, unfundedSubscriber));
        dm.openDisputeForSelf(1000, 2000, 10, keccak256("evidence"));
    }

    function test_openDisputeForSelf_revertsForZeroLoss() public {
        vm.prank(subscriber);
        vm.expectRevert(DisputeManager.ZeroLoss.selector);
        dm.openDisputeForSelf(0, 2000, 10, keccak256("evidence"));
    }

    function test_openDisputeForSelf_revertsForZeroEvidenceHash() public {
        vm.prank(subscriber);
        vm.expectRevert(DisputeManager.ZeroEvidenceHash.selector);
        dm.openDisputeForSelf(1000, 2000, 10, bytes32(0));
    }

    function test_openDispute_onlyManager() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, address(this), dm.CASE_MANAGER_ROLE()
            )
        );
        dm.openDispute(subscriber, 1000, 2000, 10, keccak256("evidence"));
    }

    // --- 請求 + 分派 -----------------------------------------------------

    function test_requestAndAssign_distinct() public {
        uint256 caseId = _open();

        vm.prank(admin);
        dm.requestAssessors(caseId, 3);
        assertEq(uint8(dm.getCase(caseId).status), uint8(DisputeManager.CaseStatus.AwaitingRandomness));

        randomness.fulfillWithSeed(1, 0xABCDEF);

        address[] memory assigned = dm.getAssignedAssessors(caseId);
        assertEq(assigned.length, 3, "assigned count");
        assertEq(uint8(dm.getCase(caseId).status), uint8(DisputeManager.CaseStatus.Assigned));

        // 全部不重複且為合格鑑定者
        for (uint256 i = 0; i < assigned.length; i++) {
            assertTrue(registry.isAssessor(assigned[i]), "is assessor");
            for (uint256 j = i + 1; j < assigned.length; j++) {
                assertTrue(assigned[i] != assigned[j], "distinct");
            }
        }
    }

    function test_requestAssessors_revertsNotEnough() public {
        uint256 caseId = _open();
        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(DisputeManager.NotEnoughAssessors.selector, POOL_SIZE, uint32(6)));
        dm.requestAssessors(caseId, 6);
    }

    function test_requestAssessors_revertsZero() public {
        uint256 caseId = _open();
        vm.prank(admin);
        vm.expectRevert(DisputeManager.ZeroAssessors.selector);
        dm.requestAssessors(caseId, 0);
    }

    function test_requestAssessors_revertsWrongStatus() public {
        uint256 caseId = _open();
        vm.startPrank(admin);
        dm.requestAssessors(caseId, 3);
        // 已是 AwaitingRandomness，再次請求應 revert
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeManager.InvalidCaseStatus.selector,
                caseId,
                DisputeManager.CaseStatus.Evidence,
                DisputeManager.CaseStatus.AwaitingRandomness
            )
        );
        dm.requestAssessors(caseId, 3);
        vm.stopPrank();
    }

    function test_fulfill_revertsForNonProvider() public {
        uint256 caseId = _open();
        vm.prank(admin);
        dm.requestAssessors(caseId, 3);

        uint256[] memory words = new uint256[](1);
        words[0] = 123;
        vm.expectRevert(DisputeManager.OnlyRandomnessProvider.selector);
        dm.fulfillRandomness(1, words);
    }

    // --- Fuzz：任意種子皆得到不重複且合格的鑑定者 ------------------------

    function testFuzz_assignmentAlwaysDistinct(uint256 seed, uint8 n) public {
        uint32 numAssessors = uint32(bound(n, 1, POOL_SIZE));
        uint256 caseId = _open();

        vm.prank(admin);
        dm.requestAssessors(caseId, numAssessors);
        randomness.fulfillWithSeed(1, seed);

        address[] memory assigned = dm.getAssignedAssessors(caseId);
        assertEq(assigned.length, numAssessors);
        for (uint256 i = 0; i < assigned.length; i++) {
            assertTrue(registry.isAssessor(assigned[i]));
            for (uint256 j = i + 1; j < assigned.length; j++) {
                assertTrue(assigned[i] != assigned[j]);
            }
        }
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";

import { ChainlinkVRFAdapter } from "../src/adapters/ChainlinkVRFAdapter.sol";
import { IRandomnessConsumer } from "../src/interfaces/IRandomnessConsumer.sol";

/// @notice 驗證 adapter 以一次性 setConsumer 綁定 consumer，打破部署循環依賴。
contract ChainlinkVRFAdapterTest is Test {
    ChainlinkVRFAdapter internal adapter;

    address internal coordinator = makeAddr("coordinator");
    address internal consumer = makeAddr("consumer");
    address internal outsider = makeAddr("outsider");

    bytes32 internal constant KEY_HASH = keccak256("keyHash");
    uint256 internal constant SUB_ID = 1;
    uint32 internal constant CB_GAS = 200_000;
    uint16 internal constant CONFIRMATIONS = 3;

    function setUp() public {
        // 部署者（本測試合約）成為 owner
        adapter = new ChainlinkVRFAdapter(coordinator, KEY_HASH, SUB_ID, CB_GAS, CONFIRMATIONS, true);
    }

    function test_consumerUnsetAtDeploy() public view {
        assertEq(address(adapter.consumer()), address(0));
    }

    function test_setConsumer_binds() public {
        vm.expectEmit(true, false, false, false, address(adapter));
        emit ChainlinkVRFAdapter.ConsumerSet(IRandomnessConsumer(consumer));
        adapter.setConsumer(IRandomnessConsumer(consumer));

        assertEq(address(adapter.consumer()), consumer);
    }

    function test_setConsumer_revertsForNonOwner() public {
        vm.prank(outsider);
        vm.expectRevert(bytes("Only callable by owner"));
        adapter.setConsumer(IRandomnessConsumer(consumer));
    }

    function test_setConsumer_revertsOnZero() public {
        vm.expectRevert(ChainlinkVRFAdapter.ZeroConsumer.selector);
        adapter.setConsumer(IRandomnessConsumer(address(0)));
    }

    function test_setConsumer_revertsIfAlreadySet() public {
        adapter.setConsumer(IRandomnessConsumer(consumer));
        vm.expectRevert(ChainlinkVRFAdapter.ConsumerAlreadySet.selector);
        adapter.setConsumer(IRandomnessConsumer(makeAddr("other")));
    }

    function test_requestRandomness_revertsBeforeConsumerSet() public {
        // consumer 未設（address(0)），任何呼叫者皆非 consumer
        vm.expectRevert(ChainlinkVRFAdapter.OnlyConsumer.selector);
        adapter.requestRandomness(1);
    }

    function test_requestRandomness_revertsForNonConsumer() public {
        adapter.setConsumer(IRandomnessConsumer(consumer));
        // 守衛在呼叫 coordinator 前短路，無須真實 VRF coordinator
        vm.prank(outsider);
        vm.expectRevert(ChainlinkVRFAdapter.OnlyConsumer.selector);
        adapter.requestRandomness(1);
    }
}

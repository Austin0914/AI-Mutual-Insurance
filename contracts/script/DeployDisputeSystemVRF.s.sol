// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Script, console } from "forge-std/Script.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { FundVault } from "../src/core/FundVault.sol";
import { AssessorRegistry } from "../src/core/AssessorRegistry.sol";
import { DisputeManager } from "../src/core/DisputeManager.sol";
import { ILaunch } from "../src/interfaces/ILaunch.sol";
import { Roles } from "../src/access/Roles.sol";
import { ChainlinkVRFAdapter } from "../src/adapters/ChainlinkVRFAdapter.sol";
import { IRandomnessConsumer } from "../src/interfaces/IRandomnessConsumer.sol";

/// @title DeployDisputeSystemVRF — 以正式 Chainlink VRF v2.5 部署爭議結算系統
/// @notice 示範打破 adapter ↔ DisputeManager 循環依賴的部署順序：
///         先部署 adapter（暫不綁 consumer）→ 部署 DisputeManager(adapter)
///         → adapter.setConsumer(DisputeManager) → 授予角色。
/// @dev VRF 參數與既有 ERC20 代幣位址自環境變數讀取：
///      VRF_COORDINATOR、VRF_KEY_HASH、VRF_SUBSCRIPTION_ID、VRF_CALLBACK_GAS_LIMIT、
///      VRF_REQUEST_CONFIRMATIONS、VRF_NATIVE_PAYMENT、TOKEN。
///      用法：forge script script/DeployDisputeSystemVRF.s.sol --rpc-url <RPC> --broadcast
contract DeployDisputeSystemVRF is Script {
    function run()
        external
        returns (FundVault vault, AssessorRegistry registry, ChainlinkVRFAdapter adapter, DisputeManager dm)
    {
        address coordinator = vm.envAddress("VRF_COORDINATOR");
        bytes32 keyHash = vm.envBytes32("VRF_KEY_HASH");
        uint256 subscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");
        uint32 callbackGasLimit = uint32(vm.envUint("VRF_CALLBACK_GAS_LIMIT"));
        uint16 requestConfirmations = uint16(vm.envUint("VRF_REQUEST_CONFIRMATIONS"));
        bool nativePayment = vm.envBool("VRF_NATIVE_PAYMENT");
        IERC20 token = IERC20(vm.envAddress("TOKEN"));

        vm.startBroadcast();
        address deployer = msg.sender;

        // 1) 先部署 adapter（此時尚無 consumer，打破循環依賴）。
        adapter = new ChainlinkVRFAdapter(
            coordinator, keyHash, subscriptionId, callbackGasLimit, requestConfirmations, nativePayment
        );

        // 2) 部署金庫與名冊。正式門檻以白皮書 §7.9 建議區間設定（具體值待模擬校準）：
        //    n_min=30、D_min=0（待模擬）、HHI_max=2000bps（≈ N_eff,min=5）、η_max=1500bps（15%）。
        //    不在部署時 activate；基金於參與者 / 注資達門檻後另行呼叫 activate()。
        vault = new FundVault(
            token, deployer, ILaunch.LaunchConfig({ nMin: 30, dMin: 0, hhiMaxBps: 2000, etaMaxBps: 1500 })
        );
        registry = new AssessorRegistry(deployer);

        // 3) 部署 DisputeManager，注入既有 adapter。
        dm = new DisputeManager(deployer, registry, adapter, vault);

        // 4) 回頭一次性綁定 adapter 的 consumer，完成雙向接線。
        adapter.setConsumer(IRandomnessConsumer(address(dm)));

        // 5) 授權：結算與罰沒。
        vault.grantRole(Roles.SETTLER_ROLE, address(dm));
        registry.grantRole(registry.SLASHER_ROLE(), address(dm));

        vm.stopBroadcast();

        console.log("FundVault:", address(vault));
        console.log("AssessorRegistry:", address(registry));
        console.log("ChainlinkVRFAdapter:", address(adapter));
        console.log("DisputeManager:", address(dm));
        console.log("admin:", deployer);
    }
}

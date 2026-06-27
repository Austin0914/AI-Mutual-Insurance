// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Script, console } from "forge-std/Script.sol";

import { FundVault } from "../src/core/FundVault.sol";
import { AssessorRegistry } from "../src/core/AssessorRegistry.sol";
import { DisputeManager } from "../src/core/DisputeManager.sol";
import { ILaunch } from "../src/interfaces/ILaunch.sol";
import { Roles } from "../src/access/Roles.sol";
import { MockERC20 } from "../test/mocks/MockERC20.sol";
import { MockRandomnessProvider } from "../test/mocks/MockRandomnessProvider.sol";

/// @title DeployDisputeSystem — 部署完整爭議結算系統（金庫 + 名冊 + 爭議管理）
/// @notice 串接 FundVault、AssessorRegistry、DisputeManager，並將 SETTLER_ROLE 授予
///         DisputeManager，使爭議判定結果可自動驅動結算。供本地 / 測試網端到端驗證。
/// @dev 隨機來源此處使用 MockRandomnessProvider（可手動 fulfill）以利端到端測試。
///      正式環境改接 adapters/ChainlinkVRFAdapter，部署順序見 script/DeployDisputeSystemVRF.s.sol
///      （adapter 先部署、再 setConsumer(DisputeManager) 一次性綁定）。
///      用法：forge script script/DeployDisputeSystem.s.sol --rpc-url <RPC> --broadcast
contract DeployDisputeSystem is Script {
    function run()
        external
        returns (
            MockERC20 token,
            FundVault vault,
            AssessorRegistry registry,
            MockRandomnessProvider randomness,
            DisputeManager dm
        )
    {
        vm.startBroadcast();
        address deployer = msg.sender;

        token = new MockERC20("Mock USD", "mUSD");
        // 本地寬鬆門檻（空池即可 activate）；n_min=0、D_min=0、HHI_max=100%、η_max=100%。
        vault = new FundVault(
            token, deployer, ILaunch.LaunchConfig({ nMin: 0, dMin: 0, hhiMaxBps: 10_000, etaMaxBps: 10_000 })
        );
        registry = new AssessorRegistry(deployer);
        randomness = new MockRandomnessProvider();
        dm = new DisputeManager(deployer, registry, randomness, vault);

        // 串接：隨機來源回呼對象、結算與罰沒授權。
        randomness.setConsumer(dm);
        vault.grantRole(Roles.SETTLER_ROLE, address(dm));
        registry.grantRole(registry.SLASHER_ROLE(), address(dm));
        vault.activate();

        vm.stopBroadcast();

        console.log("MockERC20:", address(token));
        console.log("FundVault:", address(vault));
        console.log("AssessorRegistry:", address(registry));
        console.log("Randomness:", address(randomness));
        console.log("DisputeManager:", address(dm));
        console.log("admin:", deployer);

        _writeDeployments(token, vault, registry, randomness, dm);
    }

    /// @notice 將部署位址寫入 repo 根 deployments/<chainId>.json，供前後端 ABI 管線取用。
    /// @dev 需 foundry.toml 開啟 fs_permissions（../deployments/）。
    function _writeDeployments(
        MockERC20 token,
        FundVault vault,
        AssessorRegistry registry,
        MockRandomnessProvider randomness,
        DisputeManager dm
    ) private {
        string memory obj = "deployments";
        vm.serializeAddress(obj, "MockERC20", address(token));
        vm.serializeAddress(obj, "FundVault", address(vault));
        vm.serializeAddress(obj, "AssessorRegistry", address(registry));
        vm.serializeAddress(obj, "Randomness", address(randomness));
        string memory json = vm.serializeAddress(obj, "DisputeManager", address(dm));

        string memory path = string.concat("../deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(json, path);
        console.log("Deployments written to:", path);
    }
}

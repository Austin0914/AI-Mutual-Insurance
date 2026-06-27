// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import { Script, console } from "forge-std/Script.sol";

import { FundVault } from "../src/core/FundVault.sol";
import { IFundVault } from "../src/interfaces/IFundVault.sol";
import { ILaunch } from "../src/interfaces/ILaunch.sol";
import { Roles } from "../src/access/Roles.sol";
import { MockERC20 } from "../test/mocks/MockERC20.sol";

/// @title DeployFundVault — 部署測試代幣 + FundVault
/// @notice 供本地（anvil）與測試網（如 Sepolia）使用。Gas 由部署者的原生測試幣支付。
/// @dev 用法：
///      forge script script/DeployFundVault.s.sol --rpc-url <SEPOLIA_RPC> --broadcast
///      部署者地址（broadcast 簽署者）會成為 admin 並取得 SETTLER_ROLE。
///      本地以寬鬆門檻（全 0 / 上限 100%）+ activate() 示範真實啟動路徑；
///      正式部署請以建議區間設定門檻（見 DeployDisputeSystemVRF.s.sol）。
contract DeployFundVault is Script {
    function run() external returns (MockERC20 token, FundVault vault) {
        vm.startBroadcast();
        address deployer = msg.sender;

        token = new MockERC20("Mock USD", "mUSD");
        // 本地寬鬆門檻：n_min=0、D_min=0、HHI_max=100%、η_max=100%（空池即可 activate）。
        vault = new FundVault(
            token, deployer, ILaunch.LaunchConfig({ nMin: 0, dMin: 0, hhiMaxBps: 10_000, etaMaxBps: 10_000 })
        );

        // 方便測試：部署者兼任結算者，並走門檻閂鎖啟動路徑（正式環境應改由治理流程設定）。
        vault.grantRole(Roles.SETTLER_ROLE, deployer);
        vault.activate();

        vm.stopBroadcast();

        console.log("MockERC20:", address(token));
        console.log("FundVault:", address(vault));
        console.log("admin/settler:", deployer);
    }
}

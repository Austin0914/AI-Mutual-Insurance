# AGENTS.md — contracts（智慧合約）

> 本 package 的小地圖。協議唯一的權威執行層。

## 用途

Solidity 智慧合約，負責資金託管、注資、鎖倉、commit-reveal 投票紀錄、加權統計、罰沒與分層結算。**錢怎麼動、規則怎麼跑，最終由此決定。**

## 技術

Solidity + [Foundry](https://book.getfoundry.sh/)。

## 分層約定（見 [ADR-0002](../docs/adr/0002-domain-oriented-shared-kernel.md)）

「名詞放核心、動詞放薄編排層」。公式寫成 library，只實作一次。

```
src/
├─ libraries/    純函式、無狀態：TrancheMath、VoteTally、RateMath
├─ core/         持狀態核心合約：FundVault、AssessorRegistry、DisputeManager
├─ interfaces/   介面定義（I 開頭）
├─ access/       權限、暫停等橫切關注
└─ adapters/     外部整合連接器（ports-and-adapters）：ChainlinkVRFAdapter
```

完整約定見 [docs/architecture/code-organization.md](../docs/architecture/code-organization.md)。

## 進入點（建立後更新）

| 路徑                                   | 內容                                                                                                                          |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/libraries/TrancheMath.sol`        | 分層償付計算（純函式，對應 tranche.md）                                                                                       |
| `src/libraries/VoteTally.sol`          | 質押加權中位數 + quorum（純函式，對應 commit-reveal.md）                                                                      |
| `src/libraries/RateMath.sol`           | 信度加權動態費率（純函式，對應 dynamic-rate.md）                                                                              |
| `src/core/FundVault.sol`               | 基金金庫：注資、記帳、分層結算                                                                                                |
| `src/core/AssessorRegistry.sol`        | 鑑定者名冊：註冊 / 質押 / 列舉 / `slash` 罰沒                                                                                 |
| `src/core/DisputeManager.sol`          | 爭議生命週期：開案 → 隨機分派 → commit-reveal → 加權結算 → 缺席罰沒                                                           |
| `src/adapters/ChainlinkVRFAdapter.sol` | Chainlink VRF v2.5 連接器（實作 `IRandomnessProvider`）；consumer 以 `setConsumer` 一次性綁定解除與 DisputeManager 的部署循環 |
| `src/interfaces/`                      | 共用型別（`ITranche`、`IFundVault`、`IRandomnessProvider/Consumer`、`IRate`）                                                 |
| `src/access/Roles.sol`                 | 跨切面角色定義（`SETTLER_ROLE`）；`AssessorRegistry` 另有本地 `REGISTRAR_ROLE` / `SLASHER_ROLE`                               |
| `test/`                                | 單元 + fuzz + 整合測試（含 `mocks/`：ERC20 / 隨機 / 金庫）                                                                    |
| `script/DeployFundVault.s.sol`         | 金庫部署腳本（本地 / Sepolia）                                                                                                |
| `script/DeployDisputeSystem.s.sol`     | 完整爭議結算系統部署（mock 隨機，供本地 / 測試網端到端）                                                                      |
| `script/DeployDisputeSystemVRF.s.sol`  | 正式 Chainlink VRF 部署（示範解循環依賴的部署順序）                                                                           |

## 常用指令

```bash
forge build      # 編譯
forge test       # 測試
forge fmt        # 格式化
```

## 動工前先讀

- 核心邏輯規格：[docs/specs/](../docs/specs/)（tranche、commit-reveal、dynamic-rate）。
- 鏈上 / 鏈下分界：[docs/architecture/overview.md](../docs/architecture/overview.md)。
- 合約層狀態總表 / 部署接線：[docs/guides/deployment.md](../docs/guides/deployment.md)。

## 注意事項

- 示意參數（`d`、`k`、`A%` 等）視為**待校準**，勿當最終值寫死，集中管理便於調整。
- 任何機制改動需同步更新對應 [docs/specs/](../docs/specs/)。

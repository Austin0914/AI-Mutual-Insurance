# contracts — 智慧合約

協議的權威執行層。Solidity + Foundry。

> 導航與分層約定見 [AGENTS.md](AGENTS.md)；機制規格見 [../docs/specs/](../docs/specs/)。

## 先備需求

- [Foundry](https://book.getfoundry.sh/)（`forge`、`cast`、`anvil`）

```bash
# 安裝 Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

## 安裝依賴

測試依賴 `forge-std`（以 git submodule 安裝至 `lib/`）：

```bash
forge install foundry-rs/forge-std
```

## 常用指令

```bash
forge build            # 編譯
forge test             # 跑測試
forge test -vvv        # 詳細輸出（含 fuzz 反例）
forge fmt              # 格式化
forge fmt --check      # 檢查格式（CI 用）
forge coverage         # 覆蓋率
```

## 目錄結構

依 [ADR-0002](../docs/adr/0002-domain-oriented-shared-kernel.md) 的領域導向 + 共享核心：

```
src/
├─ libraries/    純函式、無狀態（TrancheMath、VoteTally、RateMath…）
├─ interfaces/   共用型別 / 介面（ITranche、IFundVault、IRandomness*…）
├─ core/         持狀態核心合約（FundVault、AssessorRegistry、DisputeManager…）
├─ access/       權限 / 暫停等橫切關注（Roles…）
└─ adapters/     外部整合連接器（ChainlinkVRFAdapter…）
test/            Foundry 測試（含 mocks/）
script/          部署 / 互動腳本
```

## 部署（本地 / Sepolia）

```bash
# 本地乾跑（僅金庫）
forge script script/DeployFundVault.s.sol

# 部署至 Sepolia（gas 由 Sepolia ETH 支付）
forge script script/DeployFundVault.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" --private-key "$PRIVATE_KEY" --broadcast
```

部署腳本一覽：

| 腳本                           | 用途                             | 隨機來源                 |
| ------------------------------ | -------------------------------- | ------------------------ |
| `DeployFundVault.s.sol`        | 僅金庫 + 測試代幣                | —                        |
| `DeployDisputeSystem.s.sol`    | 完整爭議結算系統（端到端測試用） | `MockRandomnessProvider` |
| `DeployDisputeSystemVRF.s.sol` | 完整系統 + 正式 Chainlink VRF    | `ChainlinkVRFAdapter`    |

> 完整步驟、環境變數與驗證清單見 [部署 runbook](../docs/guides/deployment.md)。
> 注資代幣為 `MockERC20`（可自由鑄造，僅供測試）；部署者兼任 admin 與 settler 並預設啟動基金。

## 目前進度

| 模組                                              | 對應規格                                           | 狀態                                            |
| ------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| `libraries/TrancheMath`                           | [tranche.md](../docs/specs/tranche.md)             | ✅ 實作 + 測試                                  |
| `core/FundVault`（注資 / 結算）                   | tranche.md §6.1/§6.3                               | ✅ 實作 + 測試                                  |
| `core/AssessorRegistry`（鑑定者名冊）             | 白皮書 §7                                          | ✅ 實作 + 測試                                  |
| `core/DisputeManager`（開案 + 隨機分派）          | 白皮書 §7                                          | ✅ M3a 實作 + 測試                              |
| `adapters/ChainlinkVRFAdapter`（VRF v2.5）        | —                                                  | ✅ 實作 + 測試（consumer 一次性綁定解循環依賴） |
| `libraries/VoteTally`（加權中位數 + quorum）      | [commit-reveal.md](../docs/specs/commit-reveal.md) | ✅ M3b 實作 + 測試                              |
| `core/DisputeManager`（commit-reveal + 加權結算） | [commit-reveal.md](../docs/specs/commit-reveal.md) | ✅ M3b 實作 + 整合測試                          |
| `core/AssessorRegistry.slash`（缺席質押罰沒）     | [commit-reveal.md](../docs/specs/commit-reveal.md) | ✅ 實作 + 測試                                  |
| `libraries/RateMath`（信度加權費率）              | [dynamic-rate.md](../docs/specs/dynamic-rate.md)   | ✅ M4 實作 + 測試                               |
| 完整啟動門檿（n_min/D_min/η_max）                 | 白皮書 §6.1.1                                      | ⏳ 後續（現為最小 `active` 旗標）               |
| 有狀態費率控制器 / LR、CR 追蹤 / 接保費           | [dynamic-rate.md](../docs/specs/dynamic-rate.md)   | ⏳ 後續（現僅純函式）                           |
| 罰沒再分配 / 公信力 Ω / 上訴層                    | 白皮書 §6.5、§9                                    | ⏳ 後續（罰沒已扣質押，再分配待實作）           |

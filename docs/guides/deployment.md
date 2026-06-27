# 合約層狀態總表 / 部署 Runbook

> 合約層的權威執行層現況與部署操作手冊。對應 [contracts/](../../contracts/)。
> 機制規格見 [docs/specs/](../specs/)；分層約定見 [code-organization.md](../architecture/code-organization.md)。

## 1. 整體狀態總表

| 模組                                     | 分層      | 對應規格                                      | 狀態                                         | 測試數 |
| ---------------------------------------- | --------- | --------------------------------------------- | -------------------------------------------- | ------ |
| `libraries/TrancheMath`                  | libraries | [tranche.md](../specs/tranche.md)             | ✅ 實作 + fuzz                               | 7      |
| `libraries/VoteTally`                    | libraries | [commit-reveal.md](../specs/commit-reveal.md) | ✅ 實作 + 測試                               | 10     |
| `libraries/RateMath`                     | libraries | [dynamic-rate.md](../specs/dynamic-rate.md)   | ✅ 實作 + fuzz                               | 4      |
| `libraries/LaunchMath`                   | libraries | 白皮書 §6.1.1                                 | ✅ HHI / η 集中度與啟動門檻 + fuzz          | 13     |
| `core/FundVault`                         | core      | tranche.md §6.1/§6.3                          | ✅ 注資 / 分層結算 + fuzz                    | 21     |
| `core/AssessorRegistry`                  | core      | 白皮書 §7                                     | ✅ 註冊 / 質押 / 列舉 / 罰沒                 | 15     |
| `core/DisputeManager`                    | core      | [commit-reveal.md](../specs/commit-reveal.md) | ✅ 開案 → 分派 → commit-reveal → 結算 → 罰沒 | 8 + 15 |
| `adapters/ChainlinkVRFAdapter`           | adapters  | —                                             | ✅ VRF v2.5（consumer 一次性綁定解循環依賴） | 7      |
| 端到端整合（DisputeManager → FundVault） | —         | —                                             | ✅ 整合測試                                  | 1      |
| **合計**                                 |           |                                               | **build / fmt 乾淨**                         | **101** |

### 尚未實作（延後項）

| 項目                                    | 對應                                        | 現況                                           |
| --------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| 完整啟動門檻（n_min / D_min / η_max）   | 白皮書 §6.1.1                               | 僅最小 `active` 旗標                           |
| 有狀態費率控制器 / LR、CR 追蹤 / 接保費 | [dynamic-rate.md](../specs/dynamic-rate.md) | 僅純函式 `RateMath`                            |
| 罰沒質押再分配 / 入庫                   | 白皮書 §6.5                                 | 已扣質押並以 `totalSlashed` 累計，再分配待實作 |
| 公信力 Ω / 專業係數加權                 | 白皮書 §7                                   | 權重僅取分派時質押快照                         |
| 上訴 / 重抽層、洩密檢舉                 | 白皮書 §6.5.1、§9                           | 未實作                                         |

## 2. 合約接線與角色

部署後合約間的依賴與授權關係：

```
            ┌──────────────┐  settle()      ┌───────────┐
            │ DisputeManager│ ─────────────▶ │ FundVault │
            │              │  SETTLER_ROLE   └───────────┘
            │  (immutable: │
            │   registry,  │  slash()        ┌──────────────────┐
            │   randomness,│ ─────────────▶  │ AssessorRegistry │
            │   fundVault) │  SLASHER_ROLE   └──────────────────┘
            └──────┬───────┘
                   │ requestRandomness()       ┌─────────────────────┐
                   └──────────────────────────▶│ ChainlinkVRFAdapter │
                   ◀── fulfillRandomness() ──── │  (consumer = dm)    │
                       setConsumer(dm)          └─────────────────────┘
```

| 合約                  | 角色 / Owner                               | 持有者           | 用途                     |
| --------------------- | ------------------------------------------ | ---------------- | ------------------------ |
| `FundVault`           | `DEFAULT_ADMIN_ROLE`                       | 部署者           | 管理角色、`setActive`    |
| `FundVault`           | `SETTLER_ROLE`                             | `DisputeManager` | 呼叫 `settle` 結算       |
| `AssessorRegistry`    | `DEFAULT_ADMIN_ROLE` / `REGISTRAR_ROLE`    | 部署者           | 管理鑑定者名冊           |
| `AssessorRegistry`    | `SLASHER_ROLE`                             | `DisputeManager` | 缺席罰沒 `slash`         |
| `DisputeManager`      | `DEFAULT_ADMIN_ROLE` / `CASE_MANAGER_ROLE` | 部署者           | 開案、請求分派、開投票   |
| `ChainlinkVRFAdapter` | `owner`（ConfirmedOwner）                  | 部署者           | `setConsumer` 一次性綁定 |

> **循環依賴解法**：`DisputeManager` 在 constructor 即注入 adapter（immutable），adapter 的
> `consumer` 改由部署後 `setConsumer` 一次性綁定，打破「兩者 constructor 互需對方」的死結。
> 詳見 [ChainlinkVRFAdapter.sol](../../contracts/src/adapters/ChainlinkVRFAdapter.sol)。

## 3. 部署腳本

| 腳本                           | 範圍                   | 隨機來源                 | 環境變數 |
| ------------------------------ | ---------------------- | ------------------------ | -------- |
| `DeployFundVault.s.sol`        | 金庫 + 測試代幣        | —                        | —        |
| `DeployDisputeSystem.s.sol`    | 完整系統（端到端測試） | `MockRandomnessProvider` | —        |
| `DeployDisputeSystemVRF.s.sol` | 完整系統 + 正式 VRF    | `ChainlinkVRFAdapter`    | 見下表   |

> `DeployDisputeSystem.s.sol` 部署完成後會將各合約位址寫入 repo 根
> `deployments/<chainId>.json`，供前後端 ABI 管線取用（見 §7）。

### `DeployDisputeSystemVRF` 環境變數

| 變數                        | 型別    | 說明                                   |
| --------------------------- | ------- | -------------------------------------- |
| `VRF_COORDINATOR`           | address | Chainlink VRF Coordinator v2.5 地址    |
| `VRF_KEY_HASH`              | bytes32 | gas lane keyHash                       |
| `VRF_SUBSCRIPTION_ID`       | uint256 | VRF 訂閱 ID                            |
| `VRF_CALLBACK_GAS_LIMIT`    | uint    | callback gas 上限                      |
| `VRF_REQUEST_CONFIRMATIONS` | uint    | 區塊確認數                             |
| `VRF_NATIVE_PAYMENT`        | bool    | `true`=原生幣（ETH）付款，`false`=LINK |
| `TOKEN`                     | address | 既有 ERC20 注資代幣地址                |

## 4. Runbook

### 前置

```bash
cd contracts
forge build          # 確認編譯無警告
forge test           # 確認 101 測試全綠
forge fmt --check    # 確認格式
```

### A. 本地（anvil）端到端

```bash
anvil    # 另開終端
forge script script/DeployDisputeSystem.s.sol \
  --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key <ANVIL_PRIVATE_KEY>
```

`MockRandomnessProvider` 可由測試手動 `fulfillWithSeed` / `fulfillWithWords` 觸發回呼，
適合本地走完整流程（開案 → 分派 → commit-reveal → 結算 → 罰沒）。

### B. 測試網（Sepolia，mock 隨機）

```bash
forge script script/DeployDisputeSystem.s.sol \
  --rpc-url "$SEPOLIA_RPC_URL" --private-key "$PRIVATE_KEY" --broadcast --verify
```

### C. 測試網 / 主網（正式 Chainlink VRF）

1. 於 [Chainlink VRF](https://vrf.chain.link/) 建立 subscription 並記下 `VRF_SUBSCRIPTION_ID`。
2. 設定環境變數（見上表）。
3. 部署：

   ```bash
   forge script script/DeployDisputeSystemVRF.s.sol \
     --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast --verify
   ```

4. **將 adapter 加為 subscription 的 consumer**，並為 subscription 充值（LINK 或原生幣，視 `VRF_NATIVE_PAYMENT`）。
5. 完成後，`DisputeManager.requestAssessors` 會透過 adapter 觸發 VRF，回呼自動分派鑑定者。

> ⚠️ 步驟 4 在 Chainlink 端操作，**腳本不會代勞**；未加 consumer / 未充值會導致 VRF 請求無回應。

## 5. 部署後驗證清單

- [ ] `vault.hasRole(SETTLER_ROLE, dm) == true`
- [ ] `registry.hasRole(SLASHER_ROLE, dm) == true`
- [ ] `vault.active() == true`
- [ ] `dm.registry() / dm.randomness() / dm.fundVault()` 指向正確地址
- [ ] （VRF）`adapter.consumer() == dm` 且 `setConsumer` 再次呼叫會 revert `ConsumerAlreadySet`
- [ ] （VRF）adapter 已在 Chainlink subscription 的 consumer 清單中，且 subscription 餘額足夠
- [ ] 部署者持有 `CASE_MANAGER_ROLE`（可開案）與 `REGISTRAR_ROLE`（可註冊鑑定者）

## 6. 注意事項

- 示意參數（`d`、`k`、`A%`、`slashBps`、`quorumBps` 等）視為**待校準**，勿當最終值。
- 正式環境的 admin / settler 應改由治理流程持有，而非單一部署者 EOA。
- 任何接線或角色調整需同步更新本文件與 [contracts/AGENTS.md](../../contracts/AGENTS.md)。

## 7. 前後端 ABI / 部署管線

以「合約為單一真相」，將 ABI、位址與型別自動傳遞到前後端。共享套件
[`packages/abi`](../../packages/)（`@ai-insurance/abi`）由前端（wagmi/viem）與後端共用。

```
contracts/out  ──(@wagmi/cli foundry)──▶  packages/abi/src/generated.ts   (ABI 常數)
deployments/<chainId>.json ─(gen-addresses)▶ packages/abi/src/addresses.ts (位址表)
                                              └▶ getContractConfig(chainId, name) → { address, abi }
```

根目錄指令（pnpm workspaces）：

| 指令                  | 作用                                                         |
| --------------------- | ------------------------------------------------------------ |
| `pnpm gen:abi`        | 由 `contracts/out` 產生 `packages/abi/src/generated.ts`      |
| `pnpm deploy:local`   | 對本地 anvil 部署，寫出 `deployments/31337.json`             |
| `pnpm gen:addresses`  | 由 `deployments/*.json` 產生 `packages/abi/src/addresses.ts` |
| `pnpm build:abi`      | 編譯 `@ai-insurance/abi` 至 `dist/`                          |
| `pnpm test:abi`       | 套件煙霧測試                                                 |
| `pnpm typecheck`      | 建置 abi 後對全工作區型別檢查                                |

典型流程：`forge build` → `pnpm gen:abi` →（部署）`pnpm deploy:local` → `pnpm gen:addresses`。
前端 / 後端僅需 `import { getContractConfig } from '@ai-insurance/abi'` 即取得型別化 `{ address, abi }`。

> `generated.ts` 提交版控（消費端免裝 forge）；`deployments/31337.json` 為本地暫時產物已 gitignore，
> 測試網 / 主網的部署檔可提交。`MockERC20` 為測試 mock，套件不輸出其 ABI（位址仍記錄於部署檔）。

## 8. 後端事件索引器部署

後端為輪詢式事件索引器（viem + PostgreSQL），非資金 / 判定權威，僅將鏈上事件投影成可查詢狀態。

### 相依

- PostgreSQL ≥ 14（可查詢的投影儲存）
- 可連線的 JSON-RPC 端點（與目標鏈一致）
- `@ai-insurance/abi` 已含目標鏈位址（`pnpm gen:addresses` 後）

### 環境變數（`backend/.env`，樣板見 [.env.example](../../backend/.env.example)）

| 變數               | 說明                                       |
| ------------------ | ------------------------------------------ |
| `RPC_URL`          | 鏈上 JSON-RPC 端點                         |
| `CHAIN_ID`         | 目標鏈 ID（須與部署鏈、位址表一致）        |
| `DATABASE_URL`     | PostgreSQL 連線字串                        |
| `START_BLOCK`      | 首次啟動的最小掃描區塊（建議設為部署區塊） |
| `CONFIRMATIONS`    | 安全確認數，`toBlock = latest - 此值`      |
| `POLL_INTERVAL_MS` | 輪詢間隔                                   |
| `MAX_BLOCK_RANGE`  | 單批最大掃描區塊數                         |

### 部署步驟

```bash
cd backend
cp .env.example .env        # 填入 RPC_URL / CHAIN_ID / DATABASE_URL / START_BLOCK
pnpm migrate                # 套用 migrations/*.sql（冪等，已套用者略過）
pnpm start                  # 啟動索引器（生產建議以 process manager 常駐）
```

### 一致性與重啟

- **冪等**：`raw_events` 以唯一鍵 `(chain_id, tx_hash, log_index)` + `ON CONFLICT DO NOTHING`，同批重掃不重複。
- **續掃**：`checkpoints` 記錄各鏈 `last_safe_block`；重啟自 `checkpoint + 1` 接續，不漏不重。
- **原子性**：每批「寫 raw_events + 套用投影 + 推進 checkpoint」於單一 DB 交易內完成。
- **reorg**：目前僅以 `CONFIRMATIONS` 緩衝規避淺層 reorg，未做回捲。

### 部署後驗證清單

- [ ] `pnpm migrate` 後 `raw_events` / `checkpoints` / `projections_fund_status` / `projections_slashed_totals` 四表存在
- [ ] 索引器日誌出現「已處理批次」且 `last_safe_block` 隨鏈頭推進、`lag` 收斂
- [ ] 觸發 `Contributed` / `Settled` 後 `projections_fund_status` 的 `total_contributed` / `pool_balance` 正確（`Settled` 以 `poolPayout` 計）
- [ ] 觸發 `AssessorSlashed` 後 `projections_slashed_totals` 對應 assessor 累加正確
- [ ] 停止再啟動，未重複寫入且自 checkpoint 續掃

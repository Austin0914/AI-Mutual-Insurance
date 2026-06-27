# 開發環境設定

> 草稿。隨各 package 建立而更新。

## 先備工具

- [Foundry](https://book.getfoundry.sh/)（合約）
- Node.js ≥ 20 + [pnpm](https://pnpm.io/) ≥ 11（前端 / 後端 / abi 套件，monorepo 以 pnpm workspaces 管理）
- PostgreSQL ≥ 14（後端事件索引器；本地可用 Docker）
- Git

## 一次性安裝

```bash
pnpm install            # 安裝整個 workspace 的相依套件
```

## 一鍵啟動（推薦）

備妥 Foundry、Node ≥ 20 + pnpm、Docker 後，於專案根目錄執行：

```bash
pnpm dev
```

腳本（[scripts/dev-up.sh](../../scripts/dev-up.sh)）會依序：

1. 啟動 PostgreSQL 容器（[docker-compose.yml](../../docker-compose.yml)），等待健康檢查通過。
2. 啟動 anvil 本地鏈（若 `8545` 已有節點則沿用）。
3. `pnpm deploy:local` 部署合約並寫出 `deployments/31337.json`。
4. `pnpm gen:addresses` + `pnpm build:abi` 產位址表並建置 ABI 套件。
5. 自動建立 `backend/.env`（若不存在）並套用資料庫 migration。
6. 同時啟動後端索引器與前端，前端在 http://localhost:3000。

按 `Ctrl-C` 會一併關閉 anvil、後端、前端並停止 Postgres 容器。本地日誌寫入 `.dev/`（anvil/deploy/migrate）。

| 指令             | 作用                                         |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | 本地端到端一鍵啟動                           |
| `pnpm dev:down`  | 停止 Postgres 容器（保留資料卷）             |
| `pnpm dev:reset` | 移除 Postgres 容器與資料卷（清空索引資料）   |

> 想理解每個環節，可參考下方各 package 的手動步驟逐步執行。

## 各 package 啟動

### 合約

```bash
cd contracts
forge build
forge test
```

### ABI 套件（前後端共用的型別 / 位址來源）

```bash
pnpm gen:abi            # 由 contracts/out 產生 packages/abi 的 ABI
pnpm deploy:local       # 對本地 anvil 部署，寫出 deployments/31337.json
pnpm gen:addresses      # 由部署檔產生位址表
```

> 典型流程：`forge build` → `pnpm gen:abi` →（部署）`pnpm deploy:local` → `pnpm gen:addresses`。
> 詳見 [deployment.md §7](deployment.md)。

### 前端

```bash
cd frontend
pnpm dev               # http://localhost:3000
```

### 後端事件索引器

後端是輪詢式事件索引器（viem + PostgreSQL），啟動前需備妥資料庫與 `.env`。

1. 啟動 PostgreSQL（任選其一）：

   ```bash
   # Docker（推薦本地開發）
   docker run --rm -d --name ai_ins_pg \
     -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
   ```

   或使用本機既有的 PostgreSQL 服務。

2. 設定環境變數：

   ```bash
   cd backend
   cp .env.example .env
   # 編輯 .env，至少確認 DATABASE_URL、RPC_URL、CHAIN_ID
   ```

   `.env` 主要變數（完整見 [backend/.env.example](../../backend/.env.example)）：

   | 變數               | 預設                                                  | 說明                              |
   | ------------------ | ----------------------------------------------------- | --------------------------------- |
   | `RPC_URL`          | `http://127.0.0.1:8545`                               | 鏈上 JSON-RPC（本地 anvil）       |
   | `CHAIN_ID`         | `31337`                                               | 目標鏈 ID                         |
   | `DATABASE_URL`     | `postgres://postgres:postgres@127.0.0.1:5432/ai_insurance` | PostgreSQL 連線字串          |
   | `START_BLOCK`      | `0`                                                   | 首次啟動的最小掃描區塊            |
   | `CONFIRMATIONS`    | `1`                                                   | 安全確認數（規避淺層 reorg）      |
   | `POLL_INTERVAL_MS` | `4000`                                                | 輪詢間隔                          |
   | `MAX_BLOCK_RANGE`  | `2000`                                                | 單批最大掃描區塊數                |

3. 套用 DB schema 並啟動：

   ```bash
   pnpm migrate          # 套用 migrations/*.sql（建立 raw_events / checkpoints / projections_*）
   pnpm dev              # tsx watch，啟動 poll loop
   ```

4. 測試：

   ```bash
   pnpm test             # 單元測試（投影映射、冪等、checkpoint）
   # 整合測試需另備一個測試用 PostgreSQL
   TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
     pnpm test:integration
   ```

## 環境變數

各 package 以 `.env.example` 為樣板，複製為 `.env` 後填入。**切勿**將含私鑰 / 機密的 `.env` 提交進版控。

## 疑難排解

| 症狀                                              | 可能原因 / 解法                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `getContractConfig` 丟「查無合約位址」            | 尚未部署或未跑 `pnpm gen:addresses`；先 `pnpm deploy:local` 再產生位址表 |
| 後端啟動報 `環境變數驗證失敗`                      | `.env` 缺必填項（`RPC_URL` 須為合法 URL、`DATABASE_URL` 不可空）        |
| 後端連不上 DB（`ECONNREFUSED`）                   | PostgreSQL 未啟動或 `DATABASE_URL` 連接埠 / 帳密不符                    |
| 索引器掃不到事件                                  | 確認 `CHAIN_ID` 與部署鏈一致、`START_BLOCK` 不晚於部署區塊             |
| 前端讀不到鏈上狀態                                | 確認 anvil 在跑、`deployments/31337.json` 已產生且位址表已更新         |
| `forge test` 找不到相依                           | 於 `contracts/` 執行 `forge install` 安裝 lib                          |

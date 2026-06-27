# AGENTS.md — backend

> 本 package 的小地圖。輔助層，**非**資金或判定的權威來源。

## 用途

事件索引、證據暫存與摘要、KYC/KYB 准入流程、爭議案件非機密中介資料、API 與通知。

## 技術

Node.js + TypeScript。

## 分層約定（見 [ADR-0002](../docs/adr/0002-domain-oriented-shared-kernel.md)）

六角架構 / ports-and-adapters，核心業務邏輯不被「換 DB / 換鏈 RPC」污染。

```
src/
├─ domain/         純業務規則與型別，不依賴框架、不碰 DB / 鏈
├─ application/    用例編排（指揮 domain + infrastructure）
└─ infrastructure/ 鏈索引、DB、KYC 外部 API、HTTP route（可替換轉接頭）
```

完整約定見 [docs/architecture/code-organization.md](../docs/architecture/code-organization.md)。

## 進入點（建立後更新）

| 路徑                              | 內容                                          |
| --------------------------------- | --------------------------------------------- |
| `src/main.ts`                     | indexer worker 入口（輪詢迴圈、退避、健康狀態） |
| `src/config.ts`                   | 環境變數載入與 zod 驗證                        |
| `src/domain/`                     | 純投影規則（事件 → 狀態），無框架依賴          |
| `src/application/`                | 用例編排（indexer 批次、projector 套用）       |
| `src/infrastructure/chain/`       | viem client、合約配置（經 `@ai-insurance/abi`）、log 抓取 |
| `src/infrastructure/db/`          | pg 連線池、migration runner、raw_events / checkpoints / projections 倉儲 |
| `migrations/`                     | SQL schema migration                          |
| `test/`                           | 單元測試；`test/integration/` 為真實 PG 整合測試 |

## 常用指令

```bash
pnpm --filter @ai-insurance/backend dev        # 開發模式（tsx watch）
pnpm --filter @ai-insurance/backend start      # 啟動 indexer
pnpm --filter @ai-insurance/backend migrate    # 套用 DB migration
pnpm --filter @ai-insurance/backend test       # 單元測試
pnpm --filter @ai-insurance/backend typecheck  # 型別檢查

# 整合測試（需先備妥 PostgreSQL）
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres \
  pnpm --filter @ai-insurance/backend test:integration
```

## 動工前先讀

- 合約 ABI / 位址透過共享套件 `@ai-insurance/abi` 取用（`import { getContractConfig } from '@ai-insurance/abi'`，以 viem 使用；管線見 [docs/guides/deployment.md §7](../docs/guides/deployment.md)）。
- API 契約：[docs/api/](../docs/api/)。
- 鏈上 / 鏈下分界與職責邊界：[docs/architecture/overview.md](../docs/architecture/overview.md)。

## 注意事項

- 不得成為資金 / 判定的權威來源；權威狀態以鏈上為準。
- 機密（私鑰、KYC 個資）切勿入版控，使用 `.env` 與安全儲存。

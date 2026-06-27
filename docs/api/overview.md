# API 總覽

> 草稿。**查詢類端點（第 1、2 組）已實作**；以下為規劃契約，標示「✅ 已實作 / 🚧 規劃中」。
> 端點落地時須同步更新本文件並補對應測試。

## 約定（建議，待定案）

- **風格**：REST（JSON）。
- **版本**：路徑前綴 `/api/v1`。
- **認證**：錢包簽章（SIWE，Sign-In with Ethereum）為主；Gatekeeper 後台另議。
- **錯誤格式**：`{ "error": { "code": string, "message": string } }`。
- **權威性**：所有涉及資金 / 判定的資料以鏈上為準，API 僅提供索引、摘要與輔助流程。
- **資料來源**：查詢類端點讀自索引器投影表（`projections_*`），非即時鏈上呼叫；回應應附 `chainId` 與資料新鮮度（`lastSafeBlock`）。

## 端點分組

### 1. 查詢（讀索引器投影）✅ 已實作

對應後端既有投影表，落地成本最低。預設監聽 `127.0.0.1:4000`（見 `HTTP_PORT`）。

| 方法 | 路徑                                  | 來源投影                      | 說明                               |
| ---- | ------------------------------------- | ----------------------------- | ---------------------------------- |
| GET  | `/api/v1/fund/status`                 | `projections_fund_status`     | 基金狀態：注資總額、已付、池餘額、active、啟動門檻 |
| GET  | `/api/v1/assessors/slashed`           | `projections_slashed_totals`  | 各鑑定者罰沒彙總                   |
| GET  | `/api/v1/health`                      | `checkpoints`                 | 索引器健康：`lastSafeBlock`、`lag` |

`GET /api/v1/fund/status` 回應草案：

```json
{
  "chainId": 31337,
  "lastSafeBlock": 1234,
  "fund": {
    "totalContributed": "1000",
    "totalPaidOut": "300",
    "poolBalance": "700",
    "active": true,
    "launch": { "nMin": "3", "dMin": "1000", "hhiMaxBps": "2500", "etaMaxBps": "4000" }
  }
}
```

> 數值以字串表示（避免 JS number 精度問題）。

### 2. 爭議流程 ✅ 已實作（案件狀態查詢）

索引器已加上 `DisputeManager` 事件投影（`projections_disputes`）。

| 方法 | 路徑                          | 說明                                         |
| ---- | ----------------------------- | -------------------------------------------- |
| GET  | `/api/v1/disputes`            | 案件列表（`?limit=&offset=`，依 caseId 由新到舊） |
| GET  | `/api/v1/disputes/:caseId`    | 單案狀態（Evidence → Voting → Resolved、投票進度、quorum、medianRatioBps） |

> 證據摘要（非機密中介資料）仍規劃中；目前僅提供鈕上雜湊與狀態機。

### 3. KYC / 准入 🚧 規劃中

- 申請、審核狀態查詢。
- 機密個資不入鏈、不入版控，依 SIWE 授權存取。

## 落地優先序（建議）

1. 第 1 組查詢端點（直接讀現有投影，無需新增鏈上監聽）。
2. `DisputeManager` 事件投影 → 第 2 組爭議查詢。
3. 第 3 組 KYC（涉及機密儲存與合規流程，獨立規劃）。

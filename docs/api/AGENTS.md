# api/ — 後端 API 契約

存放 backend 對外（前端、鑑定者工具、Gatekeeper 後台）的介面契約。

## 內容

| 檔案                       | 內容                                       | 狀態 |
| -------------------------- | ------------------------------------------ | ---- |
| [overview.md](overview.md) | API 風格、認證方式、版本策略、錯誤格式約定 | 草稿 |

## 待補

- 端點清單（依爭議流程、KYC 流程、查詢分組）
- 資料模型 / schema
- 認證與權限矩陣

> backend 為輔助層，API 不得成為資金或判定的權威來源；權威狀態以鏈上為準（見 [architecture/overview.md](../architecture/overview.md)）。

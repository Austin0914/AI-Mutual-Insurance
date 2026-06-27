# AGENTS.md — 專案地圖

> 這是一份**地圖**，不是百科。它只告訴你「東西在哪、該去哪找」。
> 詳細內容請循指標進入對應的 `docs/` 或各 package 的 `AGENTS.md`。

## 這是什麼

**AI 共險基金**：一個雙邊質押、自動執行、設上限的去中心化 AI 品質保證與責任分攤協議（DApp）。
合約管錢與規則，鏈下對抗式鑑定判真相。完整願景見 [docs/BluePrint](docs/BluePrint/AI共險基金白皮書.md)。

## 目錄地圖

| 路徑                     | 用途                                                                     |
| ------------------------ | ------------------------------------------------------------------------ |
| [docs/](docs/)           | 穩定的設計知識（為什麼 / 是什麼），詳見 [docs/AGENTS.md](docs/AGENTS.md) |
| [contracts/](contracts/) | Solidity 智慧合約（Foundry），詳見 contracts/AGENTS.md                   |
| [frontend/](frontend/)   | Next.js + wagmi/viem 前端，詳見 frontend/AGENTS.md                       |
| [backend/](backend/)     | Node.js/TypeScript 服務（事件索引、KYC、API），詳見 backend/AGENTS.md    |

## 要找 X 去哪裡

| 我想…                             | 去這裡                                                |
| --------------------------------- | ----------------------------------------------------- |
| 理解協議願景與機制                | [docs/BluePrint/](docs/BluePrint/AI共險基金白皮書.md) |
| 看「白皮書 → 程式碼」的可實作規格 | [docs/specs/](docs/specs/)                            |
| 理解系統架構與資料流              | [docs/architecture/](docs/architecture/)              |
| 知道某個技術決策的原因            | [docs/adr/](docs/adr/)                                |
| 串接後端 API                      | [docs/api/](docs/api/)                                |
| 設定開發環境 / 部署               | [docs/guides/](docs/guides/)                          |

## 關鍵指令

> 各 package 細節見其 `AGENTS.md`。以下為總覽。

```bash
# 合約：建置與測試
cd contracts && forge build && forge test

# 前端：開發伺服器
cd frontend && npm run dev

# 後端：開發伺服器
cd backend && npm run dev
```

## 慣例

程式碼風格、分支策略、commit 規範與部署流程見 [docs/guides/](docs/guides/)。

## 動工前先讀

- 改**合約核心邏輯**前 → 先讀 [docs/specs/](docs/specs/)（tranche、commit-reveal、dynamic-A）。
- 做**重大技術選擇**前 → 先查 [docs/adr/](docs/adr/)，並新增一筆 ADR。
- 任何改動 → 對應 package 的 `AGENTS.md` 與相關 `docs/` 需同步更新。

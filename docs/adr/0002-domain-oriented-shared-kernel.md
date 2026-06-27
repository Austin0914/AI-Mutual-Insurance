# ADR-0002：採用領域導向 + 共享核心的程式碼組織原則

- **狀態**：Accepted
- **日期**：2026-06-27

## 脈絡（Context）

本專案將歷經長串開發。過往經驗顯示：純粹**以功能切分**（feature / vertical slice，如 `deposit/`、`claim/`、`vote/` 各自實作驗證、算錢、寫狀態、發事件）容易把同一段邏輯（例如 tranche 公式、公信力更新）抄寫多份，導致重複、難維護、改參數漏改而出 bug。對智慧合約尤其致命——合約難升級、錯誤直接等於資金損失。

但另一個極端（純粹**以技術分層切分**）也有缺點：單一功能散落在各層，改一個需求要翻多個資料夾。

## 決策（Decision）

採用**領域導向 + 共享核心（Shared Kernel）**：

1. 先定義穩定的**領域名詞**作為骨幹，邏輯只實作一次、住在核心：
   `Fund`、`Contribution / Stake`、`Tranche`、`Dispute`、`Vote`、`Credibility`、`Rate`。
2. 功能（注資、索賠、投票）是**薄的編排層**，組合核心積木，不複製核心邏輯。
3. 一句話原則：**「名詞（領域模型 + 可重用函式庫）放核心、動詞（功能流程）放薄編排層」**。

各 package 的具體分層約定見 [docs/architecture/code-organization.md](../architecture/code-organization.md)。

## 後果（Consequences）

- 好處：邏輯單一來源、可單獨測試、改參數 / 公式只改一處。
- 代價：前期需先投入定義領域模型與共享函式庫，初期感覺「比直接寫功能慢」。
- 約束：公式 / 參數 / 型別須維持**單一真相來源**（見 code-organization.md）。

## 考慮過的替代方案（Alternatives）

- **純功能導向（vertical slice）**：易重複、難維護，不選（本 ADR 的主因）。
- **純技術分層**：功能散落、改需求要翻多層，不選。

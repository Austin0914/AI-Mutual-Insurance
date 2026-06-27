# ADR-0001：採用 ADR 紀錄架構決策

- **狀態**：Accepted
- **日期**：2026-06-27

## 脈絡（Context）

本專案為長期、含前後端與智慧合約的 DApp，將歷經大量技術選擇（鏈、框架、協議機制參數）。若決策只存在於對話或腦中，日後會反覆爭論、難以追溯當初的取捨脈絡，對接手的人與 AI agent 尤其不利。

## 決策（Decision）

採用輕量級 **Architecture Decision Records（ADR）**：

- 每個重大決策一個檔案，編號遞增 `NNNN-標題.md`。
- 範本見 [0000-template.md](0000-template.md)。
- 決策被取代時不刪舊檔，改標 `Superseded by ADR-XXXX`。

## 後果（Consequences）

- 好處：決策脈絡可追溯；新成員 / AI 可快速理解「為什麼是現在這樣」。
- 代價：每個重大決策需額外花時間記錄。

## 考慮過的替代方案（Alternatives）

- 只用 commit message / PR 描述：分散且難檢索，不選。
- 寫進白皮書：白皮書是協議願景的真相來源，不宜混入工程決策，不選。

# 共享監控儀表板

> 狀態：草稿。共享監控儀表板是所有 Demo 角色都可進入的透明狀態頁，用來呈現基金、爭議、鑑定者與合約部署狀態。

## 目的

把協議的核心承諾視覺化：資金與規則可驗證，案件流程可追蹤，任何角色都能看到同一份共享狀態。

## 主要使用者

- AI Provider。
- AI 使用商 + 仲裁者。
- Gatekeeper。
- Demo 觀眾與技術評審。

## 主要資訊

| 區塊 | 內容 |
| --- | --- |
| Account control | 目前錢包短地址、chainId、連結 / 切換 / 斷開錢包入口。 |
| Fund health | 基金 active 狀態、總注資、池餘額、累計賠付、注資代幣。 |
| Launch readiness | 參與者數、最低注資門檻、HHI/集中度、最大單一占比、是否可啟動。 |
| Dispute overview | Evidence、AwaitingRandomness、Assigned、Voting、Resolved 的案件數。 |
| Voting monitor | commit/reveal 進度、quorum、揭露權重、未揭露風險。 |
| Assessor network | 鑑定者數、累計罰沒、罰沒排行、活躍鑑定者。 |
| Contract registry | FundVault、AssessorRegistry、DisputeManager、VRF adapter 位址。 |
| Data freshness | chainId、last safe block、索引器延遲；若沒有索引器，明確顯示尚未接 API。 |

## 主要操作

- 連結錢包、切換錢包或斷開連線。
- 重新整理鏈上狀態。
- 查看合約位址。
- 篩選爭議案件狀態。
- 進入案件詳情的佔位入口。
- 返回目前角色工作區；若目前錢包沒有角色，導向角色選擇。

## 指標與資料來源

| 指標 | 建議呈現 | 資料來源 | 狀態 |
| --- | --- | --- | --- |
| active | 已啟動 / 籌備中 | `FundVault.active()` | 鏈上可讀 |
| token | ERC20 address | `FundVault.token()` | 鏈上可讀 |
| totalContributed | 數字卡 | `FundVault.totalContributed()` 或索引器投影 | 鏈上可讀 |
| totalPaidOut | 數字卡 | `FundVault.totalPaidOut()` 或索引器投影 | 鏈上可讀 |
| poolBalance | 數字卡 + 健康狀態 | `FundVault.poolBalance()` | 鏈上可讀 |
| participantCount | 啟動門檻卡 | `FundVault.participantCount()` 或 `launchStatus()` | 鏈上可讀 |
| launchStatus | 條件 checklist | `FundVault.launchStatus()` | 鏈上可讀 |
| assessorCount | 數字卡 | `AssessorRegistry.assessorCount()` | 鏈上可讀 |
| totalSlashed | 數字卡 | `AssessorRegistry.totalSlashed()` | 鏈上可讀 |
| slashed totals by assessor | 表格 | 後端投影 `projections_slashed_totals` | 索引器規劃中 |
| dispute counts | 狀態分布 | `DisputeManager` 事件投影 | 索引器規劃中 |
| dispute list | 案件表格 | `DisputeManager` 事件投影 + `getCase(caseId)` | 索引器規劃中 |
| data freshness | lastSafeBlock、lag | 後端 `/api/v1/health` 規劃 | API 規劃中 |
| KYC queue summary | 小卡或表格 | Demo mock | Demo mock |

## 爭議案件狀態

Dashboard 需使用合約狀態機語彙，不另創不一致的名稱：

| 狀態 | UI 說明 |
| --- | --- |
| Evidence | 已開案，等待分派鑑定者。 |
| AwaitingRandomness | 已請求隨機數，等待分派結果。 |
| Assigned | 鑑定者已分派，等待開始投票。 |
| Voting | commit/reveal 時窗進行中。 |
| Resolved | 已統計並結算，或未達 quorum 結案不賠付。 |

## 視覺與互動

- Dashboard 區域應維持高資訊密度，不使用 landing hero 式大段敘事。
- 右上角或固定導覽列需保留錢包帳號選單，讓使用者像切換帳號一樣切換錢包。
- 使用黑底、hairline、細緻分隔線與 mono 數字。
- 數字卡可分成三種語意：健康、待啟動、風險。
- 爭議流程適合用狀態表、時間線或 compact pipeline，不用花俏插圖。
- 可在卡片 hover 時出現極輕微下緣 glow，但不可讓每個元件都發光。

## Demo 限制

- 若後端 HTTP 端點尚未實作，UI 必須標示 `索引器 API 尚未接入` 或 `Demo data`。
- 不應用假資料覆蓋鏈上真實狀態。
- 案件列表若為 mock，表格標題或 badge 必須明確標示。
- Dashboard 不應讓 Gatekeeper 或任何單一角色看起來能決定理賠結果。
- 未連錢包時可顯示唯讀鏈上狀態，但需要角色相關操作時必須要求連結錢包。

## 驗收標準

- 使用者能在同一頁理解基金是否啟動、池內有多少資金、有哪些爭議流程狀態。
- 合約位址與鏈 ID 可見，方便 Demo 時驗證。
- 鏈上可讀、索引器規劃中、Demo mock 三種資料有清楚標記。
- 每個角色工作區都能進入此頁。
- 此頁也能顯示、切換、斷開目前錢包，不依賴其他頁面完成帳號操作。

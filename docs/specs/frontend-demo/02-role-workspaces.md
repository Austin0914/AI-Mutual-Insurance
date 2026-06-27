# 角色工作區

> 狀態：草稿。本文定義登入後三種角色的 app workspace。共享監控儀表板另見 [03-shared-monitoring-dashboard.md](03-shared-monitoring-dashboard.md)。

## 共用 App Shell

### 目的

讓已連錢包且已選角色的使用者，在一致的產品框架中操作自己的角色任務，並可隨時查看共享監控。

### 主要使用者

- 已完成 Demo 身份選擇的使用者。

### 主要資訊

| 區塊 | 內容 |
| --- | --- |
| Top navigation | 產品名稱、目前角色、錢包帳號選單、共享監控入口。 |
| Role context | 顯示此錢包目前 Demo 身份與一句話說明。 |
| Status strip | 基金 active 狀態、池餘額、鑑定者數、目前鏈 ID。 |
| Task area | 依角色顯示最重要的下一步行動。 |
| Wallet account menu | 顯示目前錢包短地址、chainId、切換錢包、斷開連線。 |
| Reset identity | 重新選擇目前錢包的 Demo 身份，用於展示與測試。 |

### 主要操作

- 前往共享監控儀表板。
- 回到角色首頁。
- 顯示目前錢包短地址與 chainId。
- 切換錢包或連結其他錢包。
- 斷開錢包連線。
- 重設目前錢包的 Demo 身份。
- 切換錢包後重新載入對應身份流程。

### 資料來源

| 資訊 | 資料來源 |
| --- | --- |
| 目前角色 | 本地 Demo identity。 |
| 錢包地址 | wagmi account state。 |
| connector / connection status | wagmi connector state。 |
| 基金狀態 | 鏈上可讀或現有 `useFundStatus` 類 hook。 |
| 導覽 badge | 鏈上可讀 + Demo 常數。 |

### Demo 限制

- App shell 顯示的角色不等於合約權限。
- 所有 app 頁面都要保留錢包帳號選單，不只在總覽頁顯示。
- 若錢包未連線，顯示重新連結提示；若目前地址沒有角色紀錄，導回 role selection。
- 斷開連線不刪除本地角色；重設 Demo 身份才刪除目前地址的角色紀錄。

## AI Provider Workspace

### 目的

呈現 AI Provider 如何透過注資與透明規則，對 API/模型品質提供可驗證的責任承諾。

### 主要使用者

- AI 模型/API 提供商。
- 想理解 Provider 財務暴險與聲譽承諾的 Demo 觀眾。

### 主要資訊

| 區塊 | 內容 |
| --- | --- |
| Provider summary | 錢包地址、Demo 身份、基金啟動狀態、Provider 參與狀態。 |
| Contribution panel | Provider 累計注資、共同池餘額、總注資、注資代幣。 |
| Liability posture | 說明 Provider 負責模型品質、可能承擔巨災層或被追責案件。 |
| Active disputes | 與 Provider 相關的案件摘要、狀態、責任歸因比例。 |
| Quality assurance log | 以 terminal/deploy log 呈現 API 用量、注資、案件事件的 Demo 流。 |
| Next actions | 注資、查看爭議、查看共享監控。 |

### 主要操作

- 查看基金與自身注資狀態。
- 進入共享監控儀表板。
- 查看案件詳情的佔位入口。
- Demo 階段可提供「模擬 Provider 注資」或「查看注資流程」入口；是否真的寫鏈由後續實作決定。

### 資料來源

| 資訊 | 資料來源 |
| --- | --- |
| 基金 active、pool balance、token | 鏈上 `FundVault`。 |
| Provider contributionOf | 鏈上 `FundVault.contributionOf(address)`，若 hook 尚未實作則列為待接。 |
| Provider participantTypeOf | 鏈上 `FundVault.participantTypeOf(address)`，若 hook 尚未實作則列為待接。 |
| 案件列表 | 索引器規劃中；Demo 可 mock 並標示。 |
| 品質保證 log | Demo mock 或鏈上事件摘要。 |

### Demo 限制

- 不推導真實 API 用量。
- 不保證 Provider 已通過任何真實企業審查。
- 若未實作寫入交易，注資 CTA 應標示為流程展示或待接合約操作。

## AI 使用商 + 仲裁者 Workspace

### 目的

呈現使用 AI 的企業如何取得有上限的責任分攤，並作為專業鑑定者參與爭議判定。

### 主要使用者

- AI 使用企業。
- 擔任案件鑑定者的企業稽核/技術團隊。

### 主要資訊

| 區塊 | 內容 |
| --- | --- |
| Subscriber protection | 自身累計貢獻、可用共同池、示意保障上限、基金 active 狀態。 |
| Claim entry | 提出索賠 / 開啟爭議表單：loss、deductibleBps、coverageK、evidenceHash。 |
| Assessor tasks | 被分派案件、commit 截止、reveal 截止、是否已提交。 |
| Voting explainer | commit = hash(ratioBps, salt, caseId)，reveal 期才公開投票內容。 |
| Reputation/stake panel | 鑑定者 stake、是否在名冊、累計罰沒。 |
| Next actions | 提出索賠、commit vote、reveal vote、查看共享監控。 |

### 主要操作

- 查看自身基金參與與保障摘要。
- 以目前錢包呼叫 `DisputeManager.openDisputeForSelf` 開啟自身爭議案件。
- 對被分派案件提交 commit。
- 在 reveal 期揭露 ratio 與 salt。
- 查看共享監控儀表板。

### 資料來源

| 資訊 | 資料來源 |
| --- | --- |
| contributionOf、participantTypeOf | 鏈上 `FundVault`；用於判斷目前錢包是否可自助開案。 |
| assessorCount、stakeOf、isAssessor | 鏈上 `AssessorRegistry`。 |
| 被分派案件 | 鏈上 `DisputeManager.getAssignedAssessors` 需已知 caseId；列表需索引器。 |
| 案件狀態 | 鏈上 `DisputeManager.getCase(caseId)`；列表需索引器。 |
| commit/reveal 任務 | 鏈上案件資料 + 本地 salt 保存策略。 |

### Demo 限制

- salt 若由前端產生，必須提醒使用者遺失將無法 reveal；Demo 可先用流程提示，不一定落地完整保存策略。
- 使用商 + 仲裁者合併為單一 Demo 角色，不代表所有真實案件都允許利益衝突。
- 索賠所需證據與損失金額仍是鏈下事實，Demo 只把 `evidenceHash` 寫入鏈上，不驗證真偽。

## Gatekeeper Workspace

### 目的

展示資格審查商如何管理企業准入與風險分群，同時清楚區分 Gatekeeper 不負責判斷案件真相。

### 主要使用者

- 企業 KYC/KYB 審查方。
- 想理解 permissioned admission 的 Demo 觀眾。

### 主要資訊

| 區塊 | 內容 |
| --- | --- |
| Gatekeeper summary | Demo 身份、待審申請數、已通過數、需補件數。 |
| Application queue | 申請企業、申請角色、風險分群、審查狀態、最後更新。 |
| Risk tags | 業務真實性、受益所有人、API 使用場景、利益衝突、最低資本能力。 |
| Policy panel | 准入制目的：降低女巫攻擊、空殼公司、虛假索賠。 |
| Boundaries | Gatekeeper 只能審查誰能進池，不能單方面決定誰應理賠。 |
| Next actions | 查看申請、標記通過/需補件/拒絕的 Demo 操作、查看共享監控。 |

### 主要操作

- 篩選申請狀態。
- 查看申請詳情。
- Demo 標記通過、需補件、拒絕。
- 查看共享監控儀表板。

### 資料來源

| 資訊 | 資料來源 |
| --- | --- |
| 申請列表 | Demo mock。 |
| 風險標籤 | Demo mock。 |
| 審查狀態 | Demo mock 或本地狀態。 |
| 基金啟動門檻 | 鏈上 `FundVault.launchStatus()` 可讀，若 hook 尚未實作則列為待接。 |

### Demo 限制

- 不收集、儲存或展示真實個資。
- 不連接第三方 KYC/KYB 服務。
- Gatekeeper 的 Demo 操作不授予鏈上權限、不改變真實名冊。
- 拒絕理由與風險標籤是產品概念展示，不是合規建議。

# Landing 與進入流程

> 狀態：草稿。本文定義 Demo 首頁、錢包連線與角色選擇流程。視覺細節見 [04-frontend-style-guide.md](04-frontend-style-guide.md)。

## Landing Page

### 目的

用企業產品網站的方式讓第一次接觸者快速理解：

- 這是一個 AI 責任分攤基金，不是傳統保險。
- AI Provider 與 AI 使用商都需要事前注資。
- 鏈上只負責管錢與執行規則，不負責判斷真相。
- 爭議由鏈下對抗式鑑定與 commit-reveal 投票判定。
- 賠付有自負額與共同池上限，不承諾完整補償。

### 主要使用者

- Demo 評審、投資人、合作企業、技術使用者。
- 尚未連結錢包的訪客。

### 主要資訊

| 區塊 | 內容 |
| --- | --- |
| Hero | 一句話定位：雙邊質押、自動執行、設上限的 AI 品質保證與責任分攤池。 |
| Terminal log | 用類 deploy log 的語氣呈現：wallet connected、role pending、fund status、commit-reveal ready。 |
| Problem | AI agent 出錯時，單方免責與中心化理賠都不夠透明。 |
| Mechanism | 雙邊注資、鏈上託管、鏈下鑑定、分層償付、動態費率。 |
| Participant roles | Provider、使用商+仲裁者、Gatekeeper 的利益與責任。 |
| Shared dashboard teaser | 展示資金池、爭議、鑑定者、罰沒等透明狀態。 |
| Demo disclaimer | Demo 不做真實 KYC，不承諾完整保險理賠。 |

### 主要操作

- `連結錢包進入 Demo`：主要 CTA。
- 若已連結錢包，CTA 區改顯示目前短地址、進入工作區、切換錢包與斷開連線。
- `查看共享監控`：次要入口；若未連錢包，可展示唯讀 dashboard 或要求先連線，依實作取捨。
- `閱讀白皮書`：連至 `/whitepaper` 公開文件頁，內容同步讀取 `docs/BluePrint/AI共險基金白皮書.md`。

### 資料來源

| 資訊 | 資料來源 |
| --- | --- |
| 協議介紹文案 | 本文件與白皮書。 |
| 合約部署狀態 | `@ai-insurance/abi` addresses + wagmi read。 |
| 基金狀態 teaser | 可讀鏈上資料，若尚未部署則顯示「尚未偵測到本地合約」。 |
| Terminal log | 靜態或依錢包/鏈上狀態組合的 UI 文案。 |

### Demo 限制

- Landing 不應收集公司名稱、Email、文件或個資。
- 不應把「進入 Demo」描述成真實通過 KYC。
- 不應使用「保證賠付」、「完整保險」、「法律免責」等語意。

## Wallet Onboarding

### 目的

用錢包地址作為 Demo 身分主鍵，讓使用者進入對應角色流程，並讓錢包操作像帳號登入、登出與切換一樣清楚。

### 主要使用者

- 已點擊主要 CTA 的訪客。
- 已連過錢包、再次回到 Demo 的使用者。

### 狀態

| 狀態 | UI 行為 |
| --- | --- |
| 未連錢包 | 顯示連線按鈕與 Demo 說明。 |
| 連線中 | 顯示短 loading 狀態，不阻塞整頁閱讀。 |
| 已連錢包且有角色 | 顯示錢包短地址，導向對應工作區。 |
| 已連錢包但無角色 | 導向角色選擇頁。 |
| 使用者切換錢包 | 以新地址重新查詢本地角色紀錄。 |
| 使用者斷開連線 | 停止顯示角色工作區，回到連結錢包提示；保留本地角色紀錄。 |
| 錯鏈或 RPC 不可用 | 顯示本地 anvil / chainId 提示，不清除角色紀錄。 |

### 主要操作

- 連結錢包。
- 顯示目前錢包短地址與 chainId。
- 切換錢包或連結其他錢包。
- 斷開錢包連線。
- 切換錢包後重新判斷角色紀錄。
- 若已有角色，進入該角色工作區。
- 若尚無角色，進入角色選擇。

### 資料來源

| 資訊 | 資料來源 |
| --- | --- |
| wallet address | wagmi account state。 |
| connector / connection status | wagmi connector state。 |
| chainId | wagmi network state。 |
| Demo role | localStorage 或等效本地持久化。 |

### Demo 限制

- 連錢包只代表 Demo 身分識別，不代表真實企業註冊。
- 斷開錢包只結束目前 wallet session，不刪除該地址已選過的 Demo 角色。
- 不執行 SIWE 簽章；未來接後端 profile 時再導入。

## Role Selection

### 目的

讓初次進入 Demo 的錢包選擇一種前端體驗角色。

### 主要使用者

- 已連結錢包但沒有本地角色紀錄的使用者。

### 主要資訊

每張角色選擇卡需包含：

| 欄位 | 說明 |
| --- | --- |
| 角色名稱 | `AI Provider`、`AI 使用商 + 仲裁者`、`資格審查商 / Gatekeeper`。 |
| 一句話 | 該角色在協議中的任務。 |
| 主要工作 | 進入後會看到或可操作的事項。 |
| Demo 提醒 | 該身份只影響前端體驗，不代表鏈上權限。 |

### 角色卡內容

| 角色 | 一句話 | 主要工作 |
| --- | --- | --- |
| AI Provider | 對模型/API 品質提供可驗證的責任承諾。 | 查看注資責任、池狀態、被追責案件、品質保證指標。 |
| AI 使用商 + 仲裁者 | 取得有上限的責任分攤，也參與專業鑑定。 | 查看保障、提出索賠、處理被分派案件、commit/reveal 投票。 |
| Gatekeeper | 管理企業准入與風險分群，但不判斷案件真相。 | 查看申請、審查狀態、風險標籤、利益衝突提示。 |

### 主要操作

- 選擇角色。
- 確認後保存角色並導向對應工作區。
- 在頁面上方保留帳號選單，可切換錢包或斷開連線。
- 返回 landing。

### 資料來源

| 資訊 | 資料來源 |
| --- | --- |
| 錢包地址 | wagmi account state。 |
| 角色定義 | 前端常數，需與 [00-overview.md](00-overview.md) 保持一致。 |
| 已選角色 | localStorage 或等效本地持久化。 |

### Demo 限制

- 同一錢包一次只保存一種 Demo 角色。
- 切換成不同錢包時，必須重新讀取該地址自己的 Demo 角色狀態。
- 允許提供「重設 Demo 身份」入口，方便展示與測試。
- 不做合約 role 授權、不呼叫 KYC API、不要求簽章。

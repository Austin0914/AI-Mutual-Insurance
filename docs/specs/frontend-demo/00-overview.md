# 前端 Demo 總覽

> 狀態：草稿。本資料夾定義 AI 共險基金 Demo 前端的資訊架構、角色流程與視覺方向；不定義合約規則本身。資金、理賠與判定的權威仍以鏈上合約為準。

## 目的

讓使用者在不經過真實 KYC/KYB 的情況下，理解並試用「雙邊質押、自動執行、設上限的 AI 品質保證與責任分攤池」。

Demo 前端要完成三件事：

1. 用企業產品網站式 landing page 說清楚協議如何運作。
2. 用錢包連線作為 Demo 身分識別與註冊。
3. 依角色進入不同工作區，同時保留所有人可看的共享監控儀表板。

## Demo 原則

- **連結錢包 = 身分識別 + Demo 註冊**：不額外要求帳密、Email 或公司文件。
- **錢包像帳號一樣登入 / 登出 / 切換**：所有需要錢包狀態的頁面都要顯示目前錢包，並提供連結、切換與斷開連線入口。
- **不做真實 KYC/KYB**：Gatekeeper 工作區只展示准入審查概念，不收集真實企業個資。
- **角色只影響前端體驗**：角色選擇不代表鏈上權限、合約 role 或真實法遵資格。
- **鏈上狀態優先**：涉及資金、案件結算、鑑定者名冊與罰沒的資料，以合約或索引器投影為準。
- **明確標示 Demo mock**：尚未有合約、索引器或 API 支援的資料，不可偽裝成真實資料。

## 使用者與角色

| Demo 角色 | 角色鍵值 | 說明 |
| --- | --- | --- |
| AI Provider | `provider` | 模型/API 提供商，關注注資責任、品質保證、被追責案件與基金參與狀態。 |
| AI 使用商 + 仲裁者 | `subscriber_assessor` | 使用 AI 的企業，同時可擔任鑑定者；關注保障、索賠、被分派案件與 commit/reveal 投票。 |
| 資格審查商 / Gatekeeper | `gatekeeper` | Demo 化的企業准入管理者；關注申請企業、風險標籤、審查狀態與利益衝突提示。 |

## 頁面地圖

| 頁面 | 建議路徑 | 目的 |
| --- | --- | --- |
| Landing page | `/` | 產品敘事與 Demo 入口。 |
| Wallet onboarding | `/enter` 或 landing 內狀態 | 連結錢包、判斷是否已有角色紀錄。 |
| Role selection | `/choose-role` | 初次連線錢包後選擇 Demo 身份。 |
| Provider workspace | `/app/provider` | Provider 角色首頁與任務中心。 |
| Subscriber/Assessor workspace | `/app/subscriber-assessor` | 使用商與鑑定者合併工作區。 |
| Gatekeeper workspace | `/app/gatekeeper` | Demo 准入審查看板。 |
| Shared monitoring dashboard | `/app/dashboard` | 所有角色共享的基金與爭議狀態監控。 |

## 身分流程

1. 使用者進入 landing page。
2. 點擊 `連結錢包進入 Demo`。
3. 前端連線錢包，取得 wallet address。
4. 前端用 wallet address 查詢本地 Demo 角色紀錄。
5. 若已有角色，直接導向對應工作區。
6. 若沒有角色，導向角色選擇頁。
7. 使用者選擇角色後，前端以 wallet address 為 key 存入本地狀態。
8. 使用者可在 app shell 中進入共享監控儀表板，也可重設 Demo 身份。
9. 若使用者切換到另一個錢包地址，前端以新地址重新查詢 Demo 角色紀錄；有角色則進入該角色，沒有角色則進入角色選擇。
10. 若使用者斷開錢包連線，app 頁面回到連結錢包提示；本地角色紀錄保留，除非使用者明確重設 Demo 身份。

## 錢包帳號控制

錢包控制是全站 app shell 的帳號元件，不只出現在總覽或 landing。所有需要錢包狀態的頁面都必須提供一致的帳號入口。

| 狀態 | UI 行為 | 導航結果 |
| --- | --- | --- |
| 未連結錢包 | 顯示 `連結錢包` 按鈕。 | 成功連線後依地址查角色。 |
| 已連結錢包 | 顯示短地址、chainId、目前 Demo 角色與帳號選單。 | 留在目前頁面，資料以目前地址為準。 |
| 切換錢包 | 開啟 connector/account 選擇或觸發錢包切換。 | 以新地址查本地角色；有角色導向工作區，無角色導向角色選擇。 |
| 斷開連線 | 清除目前 wallet session，但不刪除本地角色紀錄。 | app 頁顯示重新連結提示；共享 dashboard 可保留唯讀鏈上狀態。 |
| 重設 Demo 身份 | 刪除目前地址的 Demo role 紀錄。 | 導向角色選擇；不等同於斷開錢包。 |

帳號選單至少要包含：

- 目前錢包短地址。
- 切換錢包 / 連結其他錢包。
- 斷開連線。
- 重設此錢包的 Demo 身份。

## 本地持久化

Demo 階段以瀏覽器本地狀態保存角色：

```ts
type DemoRole = 'provider' | 'subscriber_assessor' | 'gatekeeper'

interface DemoIdentity {
  address: `0x${string}`
  role: DemoRole
  selectedAt: string
}
```

建議 key：

```txt
ai-insurance.demo.identity.${chainId}.${address}
```

角色紀錄以 chainId + wallet address 分開保存。切換錢包時不得沿用前一個地址的角色；斷開錢包時也不得自動刪除此紀錄。

未來替換路線：

- 使用 SIWE 確認錢包控制權。
- 由後端保存 profile 與審查狀態。
- 真實 Gatekeeper 流程再接 KYC/KYB 供應商或企業准入系統。

## 資料來源分級

| 分級 | 說明 | 可用範例 |
| --- | --- | --- |
| 鏈上可讀 | 直接由 wagmi/viem 呼叫合約讀取。 | `FundVault.active`、`FundVault.poolBalance`、`AssessorRegistry.assessorCount`、`AssessorRegistry.totalSlashed`。 |
| 索引器規劃中 | 後端索引事件後提供投影，目前 HTTP API 尚未實作。 | 爭議案件列表、歷史注資事件、罰沒排行榜、資料新鮮度。 |
| Demo mock | 僅供展示流程與版面，不可標示為真實資料。 | KYC 申請列表、風險標籤、企業名稱、案件摘要文字。 |

## 不在本階段

- 真實 KYC/KYB、AML 或受益所有人審查。
- 真實公司文件上傳與個資儲存。
- 以 UI 角色替代合約權限。
- 承諾完整保險理賠或下游法律責任豁免。
- 假裝後端 HTTP API 已完成。

## 驗收標準

- 文件能直接支援後續拆出 landing、onboarding、role selection、三個角色工作區與共享 dashboard。
- 所有 wallet-aware 頁面都能顯示目前錢包，並提供連結、切換、斷開與重設 Demo 身份入口。
- 每個頁面規格都標明目的、主要使用者、資訊、操作、資料來源與 Demo 限制。
- 所有資金/判定相關描述都保留「設上限、鏈上權威、不保證全額賠付」的語意。
- 視覺方向由 [04-frontend-style-guide.md](04-frontend-style-guide.md) 單獨定義。

# 前端視覺風格：vercel-mesh

> 狀態：草稿。本文定義 Demo 前端的視覺方向。目標是讓 AI 共險基金像一個可信、精密、技術導向的協議產品，而不是一般 AI 行銷頁。

## 風格定位

- **School**：Modern Tool / Builder SaaS。
- **Vibe**：黑白精密感，由單一低飽和 gradient mesh 打破。
- **適用理由**：本產品是平台/協議/金融科技工具，重點是可驗證、規則精確、鏈上執行，不需要溫暖消費品牌感。
- **Touchstone**：Vercel、v0.dev、Next.js 文件站的技術產品語氣。

## 色彩

| 用途 | 色值 |
| --- | --- |
| Ground | `#000000` |
| Surface 1 | `#0A0A0A` |
| Surface 2 | `#111111` |
| Hairline | `#1F1F1F` 或 `rgba(255,255,255,0.08)` |
| Primary text | `#EDEDED` |
| Secondary text | `#888888` |
| CTA background | `#FFFFFF` |
| CTA text | `#000000` |

Gradient mesh accents 只用於 hero 或少數 section break：

- Cyan `#0070F3`
- Magenta `#FF0080`
- Orange `#F5A623`

Mesh 必須低飽和、高羽化、邊緣融入黑色。避免硬切、亮紫、亮粉或典型 AI cliché 漸層。

## 字體

| 用途 | 建議 |
| --- | --- |
| Display | Geist Sans 500-600；若不可用，用 Inter Tight 600。 |
| Body | Geist Sans 15-16px，weight 400，line-height 1.6。 |
| Mono | Geist Mono；用於地址、事件、terminal log、數字與合約函式名。 |

字距維持正常，不使用負字距。Dashboard 內標題不要 hero 化，保持緊湊與可掃描。

## 間距與圓角

Spacing scale：

```txt
4 / 8 / 16 / 24 / 40 / 64 / 96 / 128
```

Radius：

| 類型 | 值 |
| --- | --- |
| Small | `8px` |
| Medium | `12px` |
| Large | `16px` |

卡片不應巢狀包卡片。Dashboard section 可用 full-width band 或無框布局，只有重複項目、工具面板、modal 使用卡片。

## Hero

### 必備元素

- Full-bleed black background。
- 一個 diffuse gradient mesh，位於首屏背景或 hero 下緣。
- H1 直接說明產品定位，例如「AI 共險基金」或「AI 責任分攤協議」。
- 主 CTA：白底黑字 `連結錢包進入 Demo`。
- Terminal/deploy log readout，使用真實協議語彙。

### Terminal log 文案方向

```txt
$ connect wallet
wallet: 0x7a3...91F
identity: pending role selection
fund: formation period
vault: reads from FundVault
disputes: commit-reveal ready
```

log 應像產品狀態，不用 lorem ipsum，不要寫成裝飾性亂碼。

## Buttons

- 主要 CTA 使用白底黑字，不使用 gradient button。
- 次要按鈕使用黑底、白色 hairline、淺色文字。
- 危險/重設類操作可用細紅色文字或邊框，但不要變成大面積紅色按鈕。
- Hover 動畫 200ms ease-out。

## Wallet Account Menu

- 放在 landing CTA 區、role selection 頁頂部、所有 app shell 與共享 dashboard 的右上角或固定導覽列。
- 已連線時顯示短地址、chainId 與目前 Demo role；地址使用 mono。
- 未連線時顯示白色 solid `連結錢包` 按鈕。
- 下拉選單至少包含：切換錢包、斷開連線、重設 Demo 身份。
- 選單外觀維持黑底、hairline、白灰文字，不使用彩色錢包 avatar 作為主要視覺。
- `斷開連線` 與 `重設 Demo 身份` 要在視覺上區分：前者是 session 操作，後者是刪除目前地址的 Demo role。

## Cards 與 Dashboard

- Surface 使用 `#0A0A0A` 或 `#111111`。
- 邊線使用 hairline，不依賴重陰影。
- 可在少數重要卡片 hover 時加一層非常淡的下緣 mesh glow。
- 數字、地址、caseId、functionName 使用 mono。
- Dashboard 應高資訊密度、可掃描、像操作台，不像 landing page 的卡片牆。

## Motion

| 場景 | 建議 |
| --- | --- |
| Hover | 200ms，`cubic-bezier(0.16, 1, 0.3, 1)` |
| Layout transition | 500-700ms |
| Mesh drift | 10-20s loop，極慢、低對比 |

Motion 只增加質感，不應影響可讀性。Dashboard 數字不要過度跳動。

## Signature Moves

- 首屏唯一 gradient mesh，邊緣羽化至黑。
- 黑白 UI + hairline detail + mono 協議資料。
- Terminal log 作為 hero 的第二視覺重點。
- 卡片 hover 只在少數重要元件出現 soft glow。
- 白色 solid CTA，維持高對比。

## Avoid

- 多個 gradient mesh。
- 亮紫到粉紅的高飽和 AI 漸層。
- 每個元件都有 glow。
- 彩色主要按鈕。
- 大量 marketing 插圖、3D 裝飾或暖色消費品牌語氣。
- 把 dashboard 做成低資訊密度 landing section。

## 圖像提示

若需要生成 hero 背景圖，可使用下列 prompt seed：

```txt
Abstract atmospheric gradient on pure black #000000 background, deep blue #0070F3 fading into magenta #FF0080 and orange #F5A623, feathered edges blending into black, dreamy soft focus, no objects, no text, 16:9, very low saturation overall.
```

生成圖必須只作為 hero 背景或 section break，不可在同頁重複多張 mesh。

## 驗收標準

- 首頁第一眼是黑白精密技術產品，不是通用 AI 行銷頁。
- 全頁最多一個主要 mesh。
- CTA 為白色 solid button。
- Dashboard 以 hairline、mono、緊湊表格與狀態卡呈現。
- 頁面能承載鏈上資料與風險提示，不因視覺效果犧牲可讀性。

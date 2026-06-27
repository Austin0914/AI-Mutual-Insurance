# 程式碼組織約定

> 對應 [ADR-0002](../adr/0002-domain-oriented-shared-kernel.md)。
> 本文是三個 package 的**分層約定**，所有開發須遵循。狀態：草稿，隨各 package 建立而細化。

## 核心原則

**名詞（領域模型 + 可重用函式庫）放核心、動詞（功能流程）放薄編排層。**

避免兩個極端：

- 純功能切（vertical slice）→ 邏輯重複。
- 純技術分層 → 功能散落、改需求要翻多層。

領域名詞（跨功能共用的核心積木）：
`Fund`、`Contribution / Stake`、`Tranche`、`Dispute`、`Vote`、`Credibility`、`Rate`。

## contracts/（最關鍵，先做對）

```
src/
├─ libraries/      純函式、無狀態：TrancheMath、VoteTally、RateMath
├─ core/           持有狀態的核心合約：FundVault、AssessorRegistry、DisputeManager
├─ interfaces/     介面定義（I 開頭），跨合約 / 前後端共用
├─ access/         權限、暫停等橫切關注點
└─ adapters/       外部整合連接器（ports-and-adapters）：ChainlinkVRFAdapter
```

- [tranche.md](../specs/tranche.md)、[commit-reveal.md](../specs/commit-reveal.md)、[dynamic-rate.md](../specs/dynamic-rate.md) 的公式各自寫成 **library**，所有合約呼叫同一份，杜絕抄多遍。
- **adapters/**：對接外部服務（如 Chainlink VRF）的連接器，核心合約只依賴抽象介面（`IRandomnessProvider`），可換成 mock 測試或替換供應商，外部依賴不污染領域邏輯。

## backend/（六角架構 / ports-and-adapters）

```
src/
├─ domain/         純業務規則與型別，不依賴框架、不碰 DB / 鏈
├─ application/    用例編排（指揮 domain + infrastructure）
└─ infrastructure/ 鏈索引、DB、KYC 外部 API、HTTP route（可替換的轉接頭）
```

- 核心業務邏輯不被「換 DB / 換鏈 RPC」污染，可單獨測試。

## frontend/

```
src/
├─ lib/            合約互動、ABI、型別（從 contracts 衍生，單一來源）
├─ hooks/          共用資料 hook（useFund、useDispute…）
└─ features/       UI 功能頁（薄，組合 hooks + 元件）
```

- UI 可按功能切，但資料與合約互動邏輯統一住在 `lib` / `hooks`，不在每頁重寫。

## 單一真相來源（強制 DRY）

| 項目                    | 來源         | 規則                                                             |
| ----------------------- | ------------ | ---------------------------------------------------------------- |
| 參數（`d`、`k`、`A%`…） | 合約集中一處 | 前後端從 ABI / 設定衍生，不各自硬編碼                            |
| 型別 / ABI              | 合約為源頭   | 自動產生給前後端，不手抄                                         |
| 公式                    | 每條一處     | 合約用 library、後端用 domain 函式；規格連回 [specs/](../specs/) |

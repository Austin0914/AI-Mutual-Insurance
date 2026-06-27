# 規格：動態費率 A%

> 對應白皮書 [§6.4 動態費率](../BluePrint/AI共險基金白皮書.md) 與 §7.2。
> 狀態：公式層已於 `contracts/src/libraries/RateMath.sol` 實作；所有數字為示意值，**待校準**。

## 目的

在「AI agent 責任」尚無足夠歷史損失資料的前提下，把費率 `A%` 設計成隨經驗調整的控制變數，並持續追蹤償付能力。

## 三層費率結構

| 層  | 名稱                | 來源                                           |
| --- | ------------------- | ---------------------------------------------- |
| 1   | 基準費率 `R_manual` | 壓力測試、外部資料、模型風險等級、人工保守假設 |
| 2   | 經驗費率 `R_exp`    | 實際理賠、申訴成功率、責任歸因、損失嚴重度     |
| 3   | 可信度權重 `Z`      | 資料越多越穩定，`Z → 1`；資料越少，`Z → 0`     |

## 公式

對某風險分群，下一期費率：

```
A% = Z × R_exp + (1 − Z) × R_manual
```

- `Z ∈ [0, 1]`，為該分群的可信度因子（credibility factor）。
- 當分群案件量達「完全可信」門檻時 `Z = 1`，主要由自身經驗定價。

## 約束

- `A_provider% > A_subscriber%`（提供商承擔較大比例）。
- `A_provider%` 設天花板，防提供商主動掏空（白皮書 §7.4）。
- 兩個觀測量驅動調整：
  - **損失率 `LR`**：偏高 → 下期費率 / 資本要求上升。
  - **賠付比例 `CR`（Coverage Ratio）**：低於目標水位 → 償付能力不足，費率上升；長期健康有剩餘 → 降費或回饋。

## 狀態變數

| 變數                | 意義              |
| ------------------- | ----------------- |
| `R_manual`, `R_exp` | 基準 / 經驗費率   |
| `Z`                 | 可信度因子        |
| `LR`, `CR`          | 損失率 / 賠付比例 |

## 待解問題

- 可信度門檻與 `Z` 的具體函數形式待建模。
- 風險分群維度（模型 / 產業 / 使用場景）的定義（白皮書 §6.1.1、§9）。

## 實作約定（現行）

> 對應 `libraries/RateMath.sol` + `interfaces/IRate.sol`。純函式、無狀態，依 ADR-0002 只實作一份。

- **單位**：所有費率以基點（bps，BPS=10000）表示。
- **信度 Z**：線性限波法 `Z = min(1, n / N_full)`（`credibilityZ`）；`N_full == 0` 時 revert `ZeroThreshold`。
- **混合**：`A% = (Z·R_exp + (BPS−Z)·R_manual) / BPS`（`blendRate`）。
- **約束（clamp）**：provider 費率夾到 `providerCapBps`（§7.4）；若 subscriber > provider 則將 subscriber 夾到 provider，
  保證 `providerRateBps >= subscriberRateBps`（邊界可相等）。
- **不在本層**：有狀態費率控制器、LR/CR 觀測追蹤、接入 FundVault 保費——待後續 milestone。

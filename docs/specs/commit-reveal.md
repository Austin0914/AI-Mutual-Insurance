# 規格：保密投票（Commit-Reveal）與對抗式鑑定

> 對應白皮書 [§6.5 可信度加權的對抗式鑑定](../BluePrint/AI共險基金白皮書.md) 與 §6.5.1。
> 狀態：階段 3–6已於 `contracts/src/core/DisputeManager.sol` 實作（加權統計委派 `libraries/VoteTally.sol`）；
> 洩密檢舉、上訴層仍待實作。

## 目的

讓鑑定者在不知他人意向下獨立判斷（維持 Schelling point 有效性），同時保留鏈上可稽核紀錄：**投票前防干預，投票後保透明**。

## 階段與時窗

| 階段        | 動作                                           | 鏈上紀錄          |
| ----------- | ---------------------------------------------- | ----------------- |
| 1. 舉證     | 衝突雙方提交證據                               | 證據雜湊 / 摘要   |
| 2. 分派     | 協議抽選 / 分派鑑定者（避利益衝突）            | 指派名單          |
| 3. Commit   | 鑑定者提交 `commit = hash(v_i, r_i, case_id)`  | commit 值、時間戳 |
| 4. Reveal   | 揭露 `v_i`、理由摘要、salt `r_i`，合約驗證一致 | reveal 內容       |
| 5. 加權統計 | 依質押、公信力、專業係數計權重                 | 統計結果          |
| 6. 結算     | 寫回「是否理賠 + 責任歸因比例」                | 賠付 / 獎懲       |

## 狀態變數

| 變數                    | 意義                                        |
| ----------------------- | ------------------------------------------- |
| `v_i`                   | 鑑定者 i 的投票（是否理賠 / 責任比例）      |
| `r_i`                   | salt（隨機鹽），防止 commit 被暴力反推      |
| `Ω_i = (b_i, d_i, u_i)` | 公信力三元組，`b+d+u=1`，新人初始 `(0,0,1)` |
| `T_commit`, `T_reveal`  | commit / reveal 期截止時間                  |

## 規則與不變量

- `reveal` 必須滿足 `hash(v_i, r_i, case_id) == commit`，否則無效。
- 被指派者**未 commit 或 commit 後未 reveal** → 扣罰。
- 揭露期前，合約只暴露「已投票」事實，不暴露方向。
- 權重 = f(質押額, `Ω_i`, 專業係數)；非一人一票。

## 實作約定（現行）

> 對應 `DisputeManager` + `VoteTally`。階段性簡化，與上表的完整設計逐步收斂。

- **開案權限**：`CASE_MANAGER_ROLE` 可代開案；已在 `FundVault` 以 `Subscriber` 身份注資的使用商可呼叫 `openDisputeForSelf` 為自己開案。自助開案需 `loss > 0` 且 `evidenceHash != bytes32(0)`。
- **投票值 `v_i`**：責任歸因比例，以基點表示（0–10000 bps）。
- **commit 編碼**：`keccak256(abi.encode(uint256 ratioBps, bytes32 salt, uint256 caseId))`（鏈下需一致）。
- **聚合**：質押**加權中位數**（lower weighted median），抗極端值操縱、貼合 Schelling point。
- **權重來源**：**分派當下快照**的質押額（日後變動不影響本案）；公信力 `Ω`、專業係數加權延後。
- **出席門檻 quorum**：已揭露權重 / 總指派權重 ≥ `quorumBps` 才成案結算；未達標→結案不賠付。
- **結算**：`effectiveLoss = loss × medianRatio / BPS`，再呼叫 `FundVault.settle`（先縮放損失、再走分層自負額 / 上限）。
- **罰沒**：`startVoting` 可帶入 `slashBps`；`resolve` 時對未揭露的被指派者按 `penalty = slashBps × 快照權重 / BPS` 呼叫 `AssessorRegistry.slash`（並發 `AssessorNoShow`）。扣至 0 則自動出名冊；罰沒與出席門檻結果無關（在 no-show 迴圈內執行）。`slashBps = 0` 則僅記錄不扣。被罰質押的**再分配 / 入庫**延後（現以 `totalSlashed` 累計）。
- **狀態機**：`Evidence → AwaitingRandomness → Assigned → Voting → Resolved`；commit / reveal 以 `commitDeadline` / `revealDeadline` 時窗區分。

## 反洩密防禦（見白皮書 §6.5.1）

- **保密期**：分派到 reveal 結束前不得公開投票方向。
- **洩密檢舉（Leak Challenge）**：成立則洩密者罰沒、檢舉者獲獎。
- **匿名洩漏不作正式證據**：無法溯源者視為噪音。

## 待解問題

- 第一輪多數被串謀控制時的上訴層 / 重抽機制（白皮書 §9）。
- salt 的鏈下保存與遺失處理。

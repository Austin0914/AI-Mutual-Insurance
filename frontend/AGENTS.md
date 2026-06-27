# AGENTS.md — frontend

> 本 package 的小地圖。純展示與互動層，狀態以鏈上為準。

## 用途

參與者操作介面：注資、索賠、投票 commit/reveal、查詢基金狀態 / 費率 / 公信力 / 貢獻額。

## 技術

Next.js / React + [wagmi](https://wagmi.sh/) / [viem](https://viem.sh/) + RainbowKit。

## 分層約定（見 [ADR-0002](../docs/adr/0002-domain-oriented-shared-kernel.md)）

UI 可按功能切，但資料與合約互動邏輯統一住在 `lib` / `hooks`，不在每頁重寫。

```
src/
├─ lib/       合約互動、ABI、型別（從 contracts 衍生，單一來源）
├─ hooks/     共用資料 hook（useFund、useDispute…）
└─ features/  UI 功能頁（薄，組合 hooks + 元件）
```

完整約定見 [docs/architecture/code-organization.md](../docs/architecture/code-organization.md)。

## 進入點（建立後更新）

| 路徑             | 內容                |
| ---------------- | ------------------- |
| `app/` 或 `src/` | 頁面與元件          |
| `lib/`           | 合約互動、ABI、設定 |

> 合約 ABI / 位址 / 型別的單一來源為共享套件 `@ai-insurance/abi`（[`packages/abi`](../packages/)）。
> 以 `import { getContractConfig } from '@ai-insurance/abi'` 取得 `{ address, abi }`，`lib/` 再組裝 wagmi hooks。

## 常用指令

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # 建置
```

## 動工前先讀

- 合約介面以 [contracts/](../contracts/) 產出的 ABI 為準，透過 `@ai-insurance/abi` 取用（管線見 [docs/guides/deployment.md §7](../docs/guides/deployment.md)）。
- 後端 API 契約：[docs/api/](../docs/api/)。

## 注意事項

- 所有涉及資金 / 判定的狀態最終以鏈上為準，前端僅呈現。
- commit/reveal 的 salt 在前端 / 使用者端的保存策略需謹慎（遺失將無法 reveal）。

# 貢獻指南

> 草稿。團隊成形後再細化。

## 分支策略（建議）

- `main`：穩定。
- `feature/<簡述>`：功能開發。
- 透過 Pull Request 合併，至少一人審查。

## Commit 規範

採 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 新增動態費率合約
fix: 修正 reveal 階段驗證
docs: 更新 tranche 規格
```

## 文件同步原則

任何程式碼改動，若影響：

- **設計 / 機制** → 更新對應 [docs/specs/](../specs/) 或 [docs/architecture/](../architecture/)。
- **重大技術決策** → 新增一筆 [docs/adr/](../adr/)。
- **資料夾用途 / 進入點** → 更新該層 `AGENTS.md`。

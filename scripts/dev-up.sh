#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# 本地端一鍵啟動：Postgres → anvil → 部署合約 → 產位址/ABI → 後端索引器 → 前端
#
# 用法：pnpm dev        （等同 bash scripts/dev-up.sh）
# 結束：Ctrl-C          （會關閉 anvil / 後端 / 前端，並停止 Postgres 容器）
# 清空：pnpm dev:reset  （移除 Postgres 容器與資料卷）
#
# 需求：pnpm、Foundry（forge/anvil/cast）、Docker。
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RPC_URL="http://127.0.0.1:8545"
COMPOSE="docker compose -f $ROOT/docker-compose.yml"
LOG_DIR="$ROOT/.dev"
mkdir -p "$LOG_DIR"

log()  { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; }
need() { command -v "$1" >/dev/null 2>&1 || { err "缺少必要指令：$1（請先安裝）"; exit 1; }; }

need pnpm
need forge
need anvil
need cast
need docker
need curl

ANVIL_PID=""
BACKEND_PID=""
FRONTEND_PID=""
STARTED_ANVIL=0

cleanup() {
  echo
  log "收到結束訊號，關閉所有服務…"
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID" 2>/dev/null || true
  if [ "$STARTED_ANVIL" = "1" ] && [ -n "$ANVIL_PID" ]; then
    kill "$ANVIL_PID" 2>/dev/null || true
  fi
  $COMPOSE stop >/dev/null 2>&1 || true
  log "已停止。資料保留於 docker volume；要清空執行：pnpm dev:reset"
}
trap cleanup EXIT INT TERM

# 0) 首次執行自動安裝相依
if [ ! -d "$ROOT/node_modules" ]; then
  log "未偵測到 node_modules，執行 pnpm install…"
  pnpm install
fi

# 1) PostgreSQL（容器）
log "啟動 PostgreSQL（docker compose）…"
$COMPOSE up -d postgres
log "等待 PostgreSQL 就緒…"
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U postgres -d ai_insurance >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then err "PostgreSQL 等待逾時"; exit 1; fi
done
log "PostgreSQL 就緒。"

# 2) anvil（本地鏈；若 8545 已在跑則沿用）
if cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  log "偵測到 8545 已有節點，沿用現有 anvil。"
else
  log "啟動 anvil（log → .dev/anvil.log）…"
  anvil > "$LOG_DIR/anvil.log" 2>&1 &
  ANVIL_PID=$!
  STARTED_ANVIL=1
  for i in $(seq 1 40); do
    cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1 && break
    sleep 0.5
    if [ "$i" = "40" ]; then err "anvil 啟動逾時（見 .dev/anvil.log）"; exit 1; fi
  done
  log "anvil 就緒（chainId 31337）。"
fi

# 3) 部署合約（自動寫 deployments/31337.json）
log "部署合約到本地鏈…"
pnpm deploy:local > "$LOG_DIR/deploy.log" 2>&1
log "合約部署完成（位址見 .dev/deploy.log 或 deployments/31337.json）。"

# 4) 產位址表 + 建置 @ai-insurance/abi（供前後端消費）
log "產生位址表並建置 ABI 套件…"
pnpm gen:addresses >/dev/null
pnpm build:abi >/dev/null
log "ABI 管線完成。"

# 5) 後端 .env + 資料庫 migration
if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  log "已建立 backend/.env（複製自 .env.example）。"
fi
log "套用資料庫 migration…"
pnpm --filter @ai-insurance/backend migrate > "$LOG_DIR/migrate.log" 2>&1
log "Migration 完成。"

# 6) 啟動後端索引器（含查詢 API）+ 前端
API_URL="http://127.0.0.1:4000"
export NEXT_PUBLIC_API_URL="$API_URL"
log "啟動後端索引器與查詢 API…"
pnpm --filter @ai-insurance/backend dev &
BACKEND_PID=$!

# 等待查詢 API 健康端點就緒（最多 ~20s），再起前端。
log "等待查詢 API 就緒（$API_URL）…"
for i in $(seq 1 40); do
  if curl -fsS "$API_URL/api/v1/health" >/dev/null 2>&1; then
    log "查詢 API 就緒。"
    break
  fi
  sleep 0.5
  if [ "$i" = "40" ]; then err "查詢 API 等待逾時（後端可能仍在啟動，繼續起前端）"; fi
done

log "啟動前端…"
pnpm --filter @ai-insurance/frontend dev &
FRONTEND_PID=$!

log "─────────────────────────────────────────────"
log "全部啟動完成！"
log "  前端：     http://localhost:3000"
log "  查詢 API： $API_URL/api/v1/health"
log "  本地鏈：   $RPC_URL（chainId 31337）"
log "  Postgres： postgres://postgres:postgres@127.0.0.1:5432/ai_insurance"
log "  日誌：     .dev/anvil.log, .dev/deploy.log, .dev/migrate.log"
log "  按 Ctrl-C 結束所有服務。"
log "─────────────────────────────────────────────"

wait

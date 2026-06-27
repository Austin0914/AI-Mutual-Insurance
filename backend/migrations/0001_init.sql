-- 0001_init.sql — 事件索引器核心 schema
-- 四表：raw_events（事實來源）、checkpoints（續掃游標）、
--       projections_fund_status、projections_slashed_totals（衍生投影）。

-- 原始事件：索引器的單一事實來源。
-- 唯一鍵 (chain_id, tx_hash, log_index) 保證冪等：同一筆 log 重掃不重複寫入。
CREATE TABLE IF NOT EXISTS raw_events (
  id            BIGSERIAL PRIMARY KEY,
  chain_id      BIGINT      NOT NULL,
  block_number  BIGINT      NOT NULL,
  block_hash    TEXT        NOT NULL,
  tx_hash       TEXT        NOT NULL,
  log_index     INTEGER     NOT NULL,
  address       TEXT        NOT NULL,
  contract_name TEXT        NOT NULL,
  event_name    TEXT        NOT NULL,
  args          JSONB       NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_raw_events_identity UNIQUE (chain_id, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_raw_events_block
  ON raw_events (chain_id, block_number, log_index);

CREATE INDEX IF NOT EXISTS idx_raw_events_event
  ON raw_events (chain_id, event_name);

-- 續掃游標：每條鏈記錄已安全處理到的最後一個區塊。
CREATE TABLE IF NOT EXISTS checkpoints (
  chain_id        BIGINT      PRIMARY KEY,
  last_safe_block BIGINT      NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 基金狀態投影：每條鏈一列。
CREATE TABLE IF NOT EXISTS projections_fund_status (
  chain_id          BIGINT      PRIMARY KEY,
  total_contributed NUMERIC(78, 0) NOT NULL DEFAULT 0,
  total_paid_out    NUMERIC(78, 0) NOT NULL DEFAULT 0,
  pool_balance      NUMERIC(78, 0) NOT NULL DEFAULT 0,
  active            BOOLEAN     NOT NULL DEFAULT false,
  n_min             NUMERIC(78, 0) NOT NULL DEFAULT 0,
  d_min             NUMERIC(78, 0) NOT NULL DEFAULT 0,
  hhi_max_bps       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  eta_max_bps       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 罰沒彙總投影：每條鏈、每位鑑定人一列。
CREATE TABLE IF NOT EXISTS projections_slashed_totals (
  chain_id      BIGINT      NOT NULL,
  assessor      TEXT        NOT NULL,
  total_slashed NUMERIC(78, 0) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_slashed_totals PRIMARY KEY (chain_id, assessor)
);

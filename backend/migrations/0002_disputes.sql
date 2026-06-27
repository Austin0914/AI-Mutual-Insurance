-- 0002_disputes.sql — DisputeManager 案件狀態投影
-- 每條鏈、每個 caseId 一列；由索引器自 DisputeManager 事件摺疊而成。
-- status 對齊合約 CaseStatus：1=Evidence 2=AwaitingRandomness 3=Assigned 4=Voting 5=Resolved。

CREATE TABLE IF NOT EXISTS projections_disputes (
  chain_id         BIGINT      NOT NULL,
  case_id          NUMERIC(78, 0) NOT NULL,
  subscriber       TEXT        NOT NULL DEFAULT '',
  evidence_hash    TEXT        NOT NULL DEFAULT '',
  status           SMALLINT    NOT NULL DEFAULT 0,
  request_id       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  num_assessors    INTEGER     NOT NULL DEFAULT 0,
  assigned_count   INTEGER     NOT NULL DEFAULT 0,
  commit_deadline  NUMERIC(20, 0) NOT NULL DEFAULT 0,
  reveal_deadline  NUMERIC(20, 0) NOT NULL DEFAULT 0,
  quorum_bps       NUMERIC(78, 0) NOT NULL DEFAULT 0,
  committed_count  INTEGER     NOT NULL DEFAULT 0,
  revealed_count   INTEGER     NOT NULL DEFAULT 0,
  no_show_count    INTEGER     NOT NULL DEFAULT 0,
  quorum_met       BOOLEAN,
  median_ratio_bps NUMERIC(78, 0) NOT NULL DEFAULT 0,
  effective_loss   NUMERIC(78, 0) NOT NULL DEFAULT 0,
  opened_block     BIGINT      NOT NULL DEFAULT 0,
  resolved_block   BIGINT,
  updated_block    BIGINT      NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pk_disputes PRIMARY KEY (chain_id, case_id)
);

-- 依狀態 / 案件序查詢列表用。
CREATE INDEX IF NOT EXISTS idx_disputes_status
  ON projections_disputes (chain_id, status);

CREATE INDEX IF NOT EXISTS idx_disputes_case
  ON projections_disputes (chain_id, case_id DESC);

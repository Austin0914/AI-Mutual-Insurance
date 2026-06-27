import type { Pool, PoolClient } from 'pg'
import type { DisputeCaseState } from '../../domain/events.js'

interface DisputeRow {
  case_id: string
  subscriber: string
  evidence_hash: string
  status: number
  request_id: string
  num_assessors: number
  assigned_count: number
  commit_deadline: string
  reveal_deadline: string
  quorum_bps: string
  committed_count: number
  revealed_count: number
  no_show_count: number
  quorum_met: boolean | null
  median_ratio_bps: string
  effective_loss: string
  opened_block: string
  resolved_block: string | null
  updated_block: string
}

function rowToState(r: DisputeRow): DisputeCaseState {
  return {
    caseId: BigInt(r.case_id),
    subscriber: r.subscriber,
    evidenceHash: r.evidence_hash,
    status: Number(r.status),
    requestId: BigInt(r.request_id),
    numAssessors: Number(r.num_assessors),
    assignedCount: Number(r.assigned_count),
    commitDeadline: BigInt(r.commit_deadline),
    revealDeadline: BigInt(r.reveal_deadline),
    quorumBps: BigInt(r.quorum_bps),
    committedCount: Number(r.committed_count),
    revealedCount: Number(r.revealed_count),
    noShowCount: Number(r.no_show_count),
    quorumMet: r.quorum_met,
    medianRatioBps: BigInt(r.median_ratio_bps),
    effectiveLoss: BigInt(r.effective_loss),
    openedBlock: BigInt(r.opened_block),
    resolvedBlock: r.resolved_block === null ? null : BigInt(r.resolved_block),
    updatedBlock: BigInt(r.updated_block),
  }
}

const SELECT_COLUMNS = `case_id, subscriber, evidence_hash, status, request_id, num_assessors,
       assigned_count, commit_deadline, reveal_deadline, quorum_bps,
       committed_count, revealed_count, no_show_count, quorum_met,
       median_ratio_bps, effective_loss, opened_block, resolved_block, updated_block`

/**
 * 讀取指定 caseId 集合的目前狀態並加上 FOR UPDATE 行鎖，
 * 供同一交易內摺疊更新使用。回傳以 caseId 字串為鍵的映射（不存在者不在映射內）。
 */
export async function getDisputeCasesForUpdate(
  client: PoolClient,
  chainId: number,
  caseIds: readonly bigint[],
): Promise<Map<string, DisputeCaseState>> {
  const map = new Map<string, DisputeCaseState>()
  if (caseIds.length === 0) return map
  const ids = caseIds.map((id) => id.toString())
  const res = await client.query<DisputeRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM projections_disputes
      WHERE chain_id = $1 AND case_id = ANY($2::numeric[])
      FOR UPDATE`,
    [chainId, ids],
  )
  for (const row of res.rows) {
    const state = rowToState(row)
    map.set(state.caseId.toString(), state)
  }
  return map
}

export async function upsertDisputeCases(
  client: PoolClient,
  chainId: number,
  cases: Iterable<DisputeCaseState>,
): Promise<void> {
  for (const c of cases) {
    await client.query(
      `INSERT INTO projections_disputes
         (chain_id, case_id, subscriber, evidence_hash, status, request_id, num_assessors,
          assigned_count, commit_deadline, reveal_deadline, quorum_bps,
          committed_count, revealed_count, no_show_count, quorum_met,
          median_ratio_bps, effective_loss, opened_block, resolved_block, updated_block, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, now())
       ON CONFLICT (chain_id, case_id) DO UPDATE SET
         subscriber       = EXCLUDED.subscriber,
         evidence_hash    = EXCLUDED.evidence_hash,
         status           = EXCLUDED.status,
         request_id       = EXCLUDED.request_id,
         num_assessors    = EXCLUDED.num_assessors,
         assigned_count   = EXCLUDED.assigned_count,
         commit_deadline  = EXCLUDED.commit_deadline,
         reveal_deadline  = EXCLUDED.reveal_deadline,
         quorum_bps       = EXCLUDED.quorum_bps,
         committed_count  = EXCLUDED.committed_count,
         revealed_count   = EXCLUDED.revealed_count,
         no_show_count    = EXCLUDED.no_show_count,
         quorum_met       = EXCLUDED.quorum_met,
         median_ratio_bps = EXCLUDED.median_ratio_bps,
         effective_loss   = EXCLUDED.effective_loss,
         opened_block     = EXCLUDED.opened_block,
         resolved_block   = EXCLUDED.resolved_block,
         updated_block    = EXCLUDED.updated_block,
         updated_at       = now()`,
      [
        chainId,
        c.caseId.toString(),
        c.subscriber,
        c.evidenceHash,
        c.status,
        c.requestId.toString(),
        c.numAssessors,
        c.assignedCount,
        c.commitDeadline.toString(),
        c.revealDeadline.toString(),
        c.quorumBps.toString(),
        c.committedCount,
        c.revealedCount,
        c.noShowCount,
        c.quorumMet,
        c.medianRatioBps.toString(),
        c.effectiveLoss.toString(),
        c.openedBlock.toString(),
        c.resolvedBlock === null ? null : c.resolvedBlock.toString(),
        c.updatedBlock.toString(),
      ],
    )
  }
}

// 唯讀：案件列表（依 caseId 由新到舊，可分頁）。
export async function getDisputeList(
  pool: Pool,
  chainId: number,
  limit: number,
  offset: number,
): Promise<DisputeCaseState[]> {
  const res = await pool.query<DisputeRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM projections_disputes
      WHERE chain_id = $1
      ORDER BY case_id DESC
      LIMIT $2 OFFSET $3`,
    [chainId, limit, offset],
  )
  return res.rows.map(rowToState)
}

// 唯讀：單一案件（不存在回傳 null）。
export async function getDisputeByCaseId(
  pool: Pool,
  chainId: number,
  caseId: bigint,
): Promise<DisputeCaseState | null> {
  const res = await pool.query<DisputeRow>(
    `SELECT ${SELECT_COLUMNS}
       FROM projections_disputes
      WHERE chain_id = $1 AND case_id = $2`,
    [chainId, caseId.toString()],
  )
  if (res.rowCount === 0) return null
  return rowToState(res.rows[0])
}

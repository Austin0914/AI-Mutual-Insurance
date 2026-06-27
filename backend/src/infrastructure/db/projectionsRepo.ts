import type { Pool, PoolClient } from 'pg'
import { emptyFundStatus, type FundStatusState } from '../../domain/events.js'

interface FundStatusRow {
  total_contributed: string
  total_paid_out: string
  pool_balance: string
  active: boolean
  n_min: string
  d_min: string
  hhi_max_bps: string
  eta_max_bps: string
}

/**
 * 讀取目前 FundStatus 並對該列加上 FOR UPDATE 行鎖，
 * 避免同一交易期間的並發更新造成投影漂移。尚無紀錄時回傳 emptyFundStatus。
 */
export async function getFundStatusForUpdate(
  client: PoolClient,
  chainId: number,
): Promise<FundStatusState> {
  const res = await client.query<FundStatusRow>(
    `SELECT total_contributed, total_paid_out, pool_balance, active,
            n_min, d_min, hhi_max_bps, eta_max_bps
       FROM projections_fund_status
      WHERE chain_id = $1
      FOR UPDATE`,
    [chainId],
  )
  if (res.rowCount === 0) return { ...emptyFundStatus }
  const r = res.rows[0]
  return {
    totalContributed: BigInt(r.total_contributed),
    totalPaidOut: BigInt(r.total_paid_out),
    poolBalance: BigInt(r.pool_balance),
    active: r.active,
    nMin: BigInt(r.n_min),
    dMin: BigInt(r.d_min),
    hhiMaxBps: BigInt(r.hhi_max_bps),
    etaMaxBps: BigInt(r.eta_max_bps),
  }
}

/**
 * 唯讀取得 FundStatus（不加行鎖，供查詢 API 使用）。
 * 尚無紀錄時回傳 null，讓呼叫端區分「未啟動」與「全為 0」。
 */
export async function getFundStatus(
  pool: Pool,
  chainId: number,
): Promise<FundStatusState | null> {
  const res = await pool.query<FundStatusRow>(
    `SELECT total_contributed, total_paid_out, pool_balance, active,
            n_min, d_min, hhi_max_bps, eta_max_bps
       FROM projections_fund_status
      WHERE chain_id = $1`,
    [chainId],
  )
  if (res.rowCount === 0) return null
  const r = res.rows[0]
  return {
    totalContributed: BigInt(r.total_contributed),
    totalPaidOut: BigInt(r.total_paid_out),
    poolBalance: BigInt(r.pool_balance),
    active: r.active,
    nMin: BigInt(r.n_min),
    dMin: BigInt(r.d_min),
    hhiMaxBps: BigInt(r.hhi_max_bps),
    etaMaxBps: BigInt(r.eta_max_bps),
  }
}

export interface SlashedTotalRow {
  assessor: string
  totalSlashed: bigint
}

// 唯讀取得某鏈所有鑑定者的罰沒彙總（依罰沒總額由大到小）。
export async function getSlashedTotals(
  pool: Pool,
  chainId: number,
): Promise<SlashedTotalRow[]> {
  const res = await pool.query<{ assessor: string; total_slashed: string }>(
    `SELECT assessor, total_slashed
       FROM projections_slashed_totals
      WHERE chain_id = $1
      ORDER BY total_slashed DESC, assessor ASC`,
    [chainId],
  )
  return res.rows.map((r) => ({ assessor: r.assessor, totalSlashed: BigInt(r.total_slashed) }))
}

export async function upsertFundStatus(
  client: PoolClient,
  chainId: number,
  state: FundStatusState,
): Promise<void> {
  await client.query(
    `INSERT INTO projections_fund_status
       (chain_id, total_contributed, total_paid_out, pool_balance, active,
        n_min, d_min, hhi_max_bps, eta_max_bps, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (chain_id) DO UPDATE SET
       total_contributed = EXCLUDED.total_contributed,
       total_paid_out    = EXCLUDED.total_paid_out,
       pool_balance      = EXCLUDED.pool_balance,
       active            = EXCLUDED.active,
       n_min             = EXCLUDED.n_min,
       d_min             = EXCLUDED.d_min,
       hhi_max_bps       = EXCLUDED.hhi_max_bps,
       eta_max_bps       = EXCLUDED.eta_max_bps,
       updated_at        = now()`,
    [
      chainId,
      state.totalContributed.toString(),
      state.totalPaidOut.toString(),
      state.poolBalance.toString(),
      state.active,
      state.nMin.toString(),
      state.dMin.toString(),
      state.hhiMaxBps.toString(),
      state.etaMaxBps.toString(),
    ],
  )
}

// 依 assessor 累加罰沒總額（UPSERT 增量）。
export async function incrementSlashedTotals(
  client: PoolClient,
  chainId: number,
  totals: Map<string, bigint>,
): Promise<void> {
  for (const [assessor, amount] of totals) {
    await client.query(
      `INSERT INTO projections_slashed_totals (chain_id, assessor, total_slashed, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (chain_id, assessor) DO UPDATE SET
         total_slashed = projections_slashed_totals.total_slashed + EXCLUDED.total_slashed,
         updated_at    = now()`,
      [chainId, assessor, amount.toString()],
    )
  }
}

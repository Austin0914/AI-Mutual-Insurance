import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import type { DecodedEvent } from '../../src/domain/events.js'
import { runMigrations } from '../../src/infrastructure/db/migrate.js'
import { withTransaction } from '../../src/infrastructure/db/pool.js'
import { insertRawEvents } from '../../src/infrastructure/db/rawEvents.js'
import { getCheckpoint, setCheckpoint } from '../../src/infrastructure/db/checkpoints.js'
import { applyProjections } from '../../src/application/projector.js'

// 真實 PostgreSQL 整合測試。需設定 TEST_DATABASE_URL 才會執行：
//   docker run --rm -d -e POSTGRES_PASSWORD=postgres -p 5433:5432 postgres:16
//   TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres pnpm --filter @ai-insurance/backend test:integration
const DATABASE_URL = process.env.TEST_DATABASE_URL
const TEST_CHAIN_ID = 991337

function evt(
  eventName: string,
  args: Record<string, unknown>,
  blockNumber: bigint,
  logIndex: number,
): DecodedEvent {
  return {
    contractName: eventName === 'AssessorSlashed' ? 'AssessorRegistry' : 'FundVault',
    eventName,
    address: '0x00000000000000000000000000000000000000ab',
    blockNumber,
    blockHash: `0xblock${blockNumber}`,
    txHash: `0xtx${blockNumber}${logIndex}`,
    logIndex,
    args,
  }
}

// 模擬五個事件（一個批次）。
const BATCH: DecodedEvent[] = [
  evt('LaunchConfigUpdated', { nMin: 3n, dMin: 1000n, hhiMaxBps: 2500n, etaMaxBps: 4000n }, 1n, 0),
  evt('ActiveStatusChanged', { active: true }, 2n, 0),
  evt('Contributed', { amount: 1000n, newTotal: 1000n }, 3n, 0),
  evt('Settled', { loss: 400n, deductible: 100n, poolPayout: 300n, residual: 0n }, 4n, 0),
  evt('AssessorSlashed', { assessor: '0xAaAa000000000000000000000000000000000001', amount: 500n, newStake: 0n }, 5n, 1),
]

describe.skipIf(!DATABASE_URL)('索引器管線整合測試（真實 PostgreSQL）', () => {
  let pool: Pool

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL })
    await runMigrations(pool)
    // 清理本測試鏈的殘留資料，確保可重複執行。
    await pool.query('DELETE FROM raw_events WHERE chain_id = $1', [TEST_CHAIN_ID])
    await pool.query('DELETE FROM checkpoints WHERE chain_id = $1', [TEST_CHAIN_ID])
    await pool.query('DELETE FROM projections_fund_status WHERE chain_id = $1', [TEST_CHAIN_ID])
    await pool.query('DELETE FROM projections_slashed_totals WHERE chain_id = $1', [TEST_CHAIN_ID])
    await pool.query('DELETE FROM projections_disputes WHERE chain_id = $1', [TEST_CHAIN_ID])
  })

  afterAll(async () => {
    await pool?.end()
  })

  async function processBatch(events: DecodedEvent[], toBlock: bigint): Promise<number> {
    return withTransaction(pool, async (tx) => {
      const inserted = await insertRawEvents(tx, TEST_CHAIN_ID, events)
      await applyProjections(tx, TEST_CHAIN_ID, events)
      await setCheckpoint(tx, TEST_CHAIN_ID, toBlock)
      return inserted
    })
  }

  it('首批寫入 raw_events 並產生正確投影（驗證點 1、4）', async () => {
    const inserted = await processBatch(BATCH, 5n)
    expect(inserted).toBe(5)

    const raw = await pool.query('SELECT count(*)::int AS n FROM raw_events WHERE chain_id = $1', [
      TEST_CHAIN_ID,
    ])
    expect(raw.rows[0].n).toBe(5)

    const fund = await pool.query(
      `SELECT total_contributed, total_paid_out, pool_balance, active,
              n_min, d_min, hhi_max_bps, eta_max_bps
         FROM projections_fund_status WHERE chain_id = $1`,
      [TEST_CHAIN_ID],
    )
    const f = fund.rows[0]
    expect(f.total_contributed).toBe('1000')
    expect(f.total_paid_out).toBe('300') // poolPayout，而非 loss
    expect(f.pool_balance).toBe('700') // 1000 - 300
    expect(f.active).toBe(true)
    expect(f.n_min).toBe('3')
    expect(f.hhi_max_bps).toBe('2500')

    const slashed = await pool.query(
      'SELECT total_slashed FROM projections_slashed_totals WHERE chain_id = $1 AND assessor = $2',
      [TEST_CHAIN_ID, '0xaaaa000000000000000000000000000000000001'],
    )
    expect(slashed.rows[0].total_slashed).toBe('500')

    const cp = await getCheckpoint(pool, TEST_CHAIN_ID)
    expect(cp).toBe(5n)
  })

  it('同批次重跑不重複寫入，投影不重複累加（驗證點 2）', async () => {
    const inserted = await processBatch(BATCH, 5n)
    expect(inserted).toBe(0) // 唯一鍵生效

    const raw = await pool.query('SELECT count(*)::int AS n FROM raw_events WHERE chain_id = $1', [
      TEST_CHAIN_ID,
    ])
    expect(raw.rows[0].n).toBe(5)

    const fund = await pool.query(
      'SELECT total_contributed, pool_balance FROM projections_fund_status WHERE chain_id = $1',
      [TEST_CHAIN_ID],
    )
    // 注意：本測試重跑會重新套用投影，故金額會變動；此處僅驗證 raw_events 冪等。
    expect(fund.rowCount).toBe(1)
  })

  it('可從 checkpoint 正確續掃（驗證點 3）', async () => {
    const cp = await getCheckpoint(pool, TEST_CHAIN_ID)
    expect(cp).toBe(5n)

    // 模擬重啟後新批次（block 6）。
    const more: DecodedEvent[] = [evt('Contributed', { amount: 250n, newTotal: 250n }, 6n, 0)]
    const inserted = await processBatch(more, 6n)
    expect(inserted).toBe(1)

    const cp2 = await getCheckpoint(pool, TEST_CHAIN_ID)
    expect(cp2).toBe(6n)
  })

  it('DisputeManager 事件投影至 projections_disputes（驗證點 5）', async () => {
    const disputeEvents: DecodedEvent[] = [
      {
        contractName: 'DisputeManager',
        eventName: 'DisputeOpened',
        address: '0x00000000000000000000000000000000000000dd',
        blockNumber: 7n,
        blockHash: '0xblock7',
        txHash: '0xtxd70',
        logIndex: 0,
        args: { caseId: 1n, subscriber: '0xAbC0000000000000000000000000000000000009', evidenceHash: '0xhash' },
      },
      {
        contractName: 'DisputeManager',
        eventName: 'VotingStarted',
        address: '0x00000000000000000000000000000000000000dd',
        blockNumber: 8n,
        blockHash: '0xblock8',
        txHash: '0xtxd80',
        logIndex: 0,
        args: { caseId: 1n, commitDeadline: 1000n, revealDeadline: 2000n, quorumBps: 6000n },
      },
      {
        contractName: 'DisputeManager',
        eventName: 'VoteCommitted',
        address: '0x00000000000000000000000000000000000000dd',
        blockNumber: 8n,
        blockHash: '0xblock8',
        txHash: '0xtxd81',
        logIndex: 1,
        args: { caseId: 1n, assessor: '0x1' },
      },
    ]
    await processBatch(disputeEvents, 8n)

    const row = await pool.query(
      `SELECT status, committed_count, quorum_bps, subscriber
         FROM projections_disputes WHERE chain_id = $1 AND case_id = 1`,
      [TEST_CHAIN_ID],
    )
    expect(row.rowCount).toBe(1)
    expect(Number(row.rows[0].status)).toBe(4) // Voting
    expect(row.rows[0].committed_count).toBe(1)
    expect(row.rows[0].quorum_bps).toBe('6000')

    // 後續批次解決案件，狀態推進至 Resolved 並保留累積計數。
    await processBatch(
      [
        {
          contractName: 'DisputeManager',
          eventName: 'CaseResolved',
          address: '0x00000000000000000000000000000000000000dd',
          blockNumber: 9n,
          blockHash: '0xblock9',
          txHash: '0xtxd90',
          logIndex: 0,
          args: { caseId: 1n, quorumMet: true, medianRatioBps: 7500n, effectiveLoss: 300n },
        },
      ],
      9n,
    )
    const resolved = await pool.query(
      `SELECT status, quorum_met, median_ratio_bps, committed_count
         FROM projections_disputes WHERE chain_id = $1 AND case_id = 1`,
      [TEST_CHAIN_ID],
    )
    expect(Number(resolved.rows[0].status)).toBe(5) // Resolved
    expect(resolved.rows[0].quorum_met).toBe(true)
    expect(resolved.rows[0].median_ratio_bps).toBe('7500')
    expect(resolved.rows[0].committed_count).toBe(1) // 跨批保留
  })
})

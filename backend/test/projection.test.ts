import { describe, expect, it } from 'vitest'
import { emptyFundStatus, type DecodedEvent } from '../src/domain/events.js'
import {
  foldFundStatus,
  reduceFundStatus,
  reduceSlashIncrements,
  toSlashIncrement,
} from '../src/domain/projection.js'

function evt(eventName: string, args: Record<string, unknown>, logIndex = 0): DecodedEvent {
  return {
    contractName: 'FundVault',
    eventName,
    address: '0xcontract',
    blockNumber: 1n,
    blockHash: '0xblock',
    txHash: '0xtx',
    logIndex,
    args,
  }
}

describe('foldFundStatus', () => {
  it('Contributed 累加 totalContributed 與 poolBalance', () => {
    const next = foldFundStatus(emptyFundStatus, evt('Contributed', { amount: 100n, newTotal: 100n }))
    expect(next.totalContributed).toBe(100n)
    expect(next.poolBalance).toBe(100n)
  })

  it('Settled 使用 poolPayout（非 loss）累加 totalPaidOut 並扣減 poolBalance', () => {
    const seeded = { ...emptyFundStatus, poolBalance: 100n, totalContributed: 100n }
    const next = foldFundStatus(
      seeded,
      evt('Settled', { loss: 80n, deductible: 20n, poolPayout: 30n, residual: 30n }),
    )
    expect(next.totalPaidOut).toBe(30n)
    expect(next.poolBalance).toBe(70n)
    expect(next.totalContributed).toBe(100n)
  })

  it('ActiveStatusChanged 覆寫 active', () => {
    expect(foldFundStatus(emptyFundStatus, evt('ActiveStatusChanged', { active: true })).active).toBe(
      true,
    )
    const on = { ...emptyFundStatus, active: true }
    expect(foldFundStatus(on, evt('ActiveStatusChanged', { active: false })).active).toBe(false)
  })

  it('LaunchConfigUpdated 覆寫 n_min/d_min/hhi_max_bps/eta_max_bps', () => {
    const next = foldFundStatus(
      emptyFundStatus,
      evt('LaunchConfigUpdated', { nMin: 3n, dMin: 1000n, hhiMaxBps: 2500n, etaMaxBps: 4000n }),
    )
    expect(next.nMin).toBe(3n)
    expect(next.dMin).toBe(1000n)
    expect(next.hhiMaxBps).toBe(2500n)
    expect(next.etaMaxBps).toBe(4000n)
  })

  it('未知事件不改變狀態', () => {
    const next = foldFundStatus(emptyFundStatus, evt('SomethingElse', {}))
    expect(next).toEqual(emptyFundStatus)
  })

  it('接受字串型別的數值（viem 序列化容忍）', () => {
    const next = foldFundStatus(emptyFundStatus, evt('Contributed', { amount: '250', newTotal: '250' }))
    expect(next.totalContributed).toBe(250n)
  })
})

describe('reduceFundStatus', () => {
  it('依序套用多筆事件', () => {
    const events: DecodedEvent[] = [
      evt('Contributed', { amount: 100n, newTotal: 100n }, 0),
      evt('Contributed', { amount: 50n, newTotal: 150n }, 1),
      evt('ActiveStatusChanged', { active: true }, 2),
      evt('Settled', { loss: 40n, deductible: 10n, poolPayout: 40n, residual: 0n }, 3),
    ]
    const next = reduceFundStatus(emptyFundStatus, events)
    expect(next.totalContributed).toBe(150n)
    expect(next.totalPaidOut).toBe(40n)
    expect(next.poolBalance).toBe(110n)
    expect(next.active).toBe(true)
  })
})

describe('slash 增量', () => {
  it('toSlashIncrement 解析 AssessorSlashed 並小寫化位址', () => {
    const inc = toSlashIncrement(
      evt('AssessorSlashed', { assessor: '0xABCDEF', amount: 500n, newStake: 0n }),
    )
    expect(inc).toEqual({ assessor: '0xabcdef', amount: 500n })
  })

  it('非 slash 事件回傳 null', () => {
    expect(toSlashIncrement(evt('Contributed', { amount: 1n, newTotal: 1n }))).toBeNull()
  })

  it('reduceSlashIncrements 依 assessor 累加', () => {
    const events: DecodedEvent[] = [
      evt('AssessorSlashed', { assessor: '0xAAA', amount: 100n, newStake: 0n }),
      evt('AssessorSlashed', { assessor: '0xAAA', amount: 50n, newStake: 0n }),
      evt('AssessorSlashed', { assessor: '0xBBB', amount: 70n, newStake: 0n }),
    ]
    const totals = reduceSlashIncrements(events)
    expect(totals.get('0xaaa')).toBe(150n)
    expect(totals.get('0xbbb')).toBe(70n)
  })
})

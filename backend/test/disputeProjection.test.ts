import { describe, expect, it } from 'vitest'
import { emptyDisputeCase, type DecodedEvent, type DisputeCaseState } from '../src/domain/events.js'
import {
  caseIdOf,
  collectDisputeCaseIds,
  foldDisputeCase,
  reduceDisputeCases,
} from '../src/domain/disputeProjection.js'

function evt(
  eventName: string,
  args: Record<string, unknown>,
  blockNumber = 1n,
  logIndex = 0,
): DecodedEvent {
  return {
    contractName: 'DisputeManager',
    eventName,
    address: '0xdispute',
    blockNumber,
    blockHash: '0xblock',
    txHash: '0xtx',
    logIndex,
    args,
  }
}

describe('foldDisputeCase', () => {
  it('DisputeOpened 建立案件並進入 Evidence 狀態', () => {
    const next = foldDisputeCase(
      emptyDisputeCase(1n),
      evt('DisputeOpened', { caseId: 1n, subscriber: '0xAbC0000000000000000000000000000000000001', evidenceHash: '0xhash' }, 10n),
    )
    expect(next.status).toBe(1)
    expect(next.subscriber).toBe('0xabc0000000000000000000000000000000000001')
    expect(next.evidenceHash).toBe('0xhash')
    expect(next.openedBlock).toBe(10n)
    expect(next.updatedBlock).toBe(10n)
  })

  it('AssessorsRequested 進入 AwaitingRandomness 並記錄 requestId/numAssessors', () => {
    const next = foldDisputeCase(
      emptyDisputeCase(1n),
      evt('AssessorsRequested', { caseId: 1n, requestId: 42n, numAssessors: 5 }),
    )
    expect(next.status).toBe(2)
    expect(next.requestId).toBe(42n)
    expect(next.numAssessors).toBe(5)
  })

  it('AssessorsAssigned 進入 Assigned 並記錄分派人數', () => {
    const next = foldDisputeCase(
      emptyDisputeCase(1n),
      evt('AssessorsAssigned', { caseId: 1n, assessors: ['0x1', '0x2', '0x3'] }),
    )
    expect(next.status).toBe(3)
    expect(next.assignedCount).toBe(3)
  })

  it('VotingStarted 進入 Voting 並記錄截止時間與 quorum', () => {
    const next = foldDisputeCase(
      emptyDisputeCase(1n),
      evt('VotingStarted', { caseId: 1n, commitDeadline: 1000n, revealDeadline: 2000n, quorumBps: 6000n }),
    )
    expect(next.status).toBe(4)
    expect(next.commitDeadline).toBe(1000n)
    expect(next.revealDeadline).toBe(2000n)
    expect(next.quorumBps).toBe(6000n)
  })

  it('VoteCommitted / VoteRevealed / AssessorNoShow 累加各自計數', () => {
    let s: DisputeCaseState = emptyDisputeCase(1n)
    s = foldDisputeCase(s, evt('VoteCommitted', { caseId: 1n, assessor: '0x1' }))
    s = foldDisputeCase(s, evt('VoteCommitted', { caseId: 1n, assessor: '0x2' }))
    s = foldDisputeCase(s, evt('VoteRevealed', { caseId: 1n, assessor: '0x1', ratioBps: 5000n }))
    s = foldDisputeCase(s, evt('AssessorNoShow', { caseId: 1n, assessor: '0x3' }))
    expect(s.committedCount).toBe(2)
    expect(s.revealedCount).toBe(1)
    expect(s.noShowCount).toBe(1)
  })

  it('CaseResolved 進入 Resolved 並記錄結果', () => {
    const next = foldDisputeCase(
      emptyDisputeCase(1n),
      evt('CaseResolved', { caseId: 1n, quorumMet: true, medianRatioBps: 7500n, effectiveLoss: 300n }, 99n),
    )
    expect(next.status).toBe(5)
    expect(next.quorumMet).toBe(true)
    expect(next.medianRatioBps).toBe(7500n)
    expect(next.effectiveLoss).toBe(300n)
    expect(next.resolvedBlock).toBe(99n)
  })

  it('容忍 string/number 形式的數值參數', () => {
    const next = foldDisputeCase(
      emptyDisputeCase(1n),
      evt('AssessorsRequested', { caseId: '1', requestId: '42', numAssessors: '5' }),
    )
    expect(next.requestId).toBe(42n)
    expect(next.numAssessors).toBe(5)
  })
})

describe('caseIdOf', () => {
  it('回傳 DisputeManager 事件的 caseId', () => {
    expect(caseIdOf(evt('VoteCommitted', { caseId: 7n, assessor: '0x1' }))).toBe(7n)
  })

  it('非爭議事件回傳 null', () => {
    expect(caseIdOf(evt('Contributed', { amount: 1n }))).toBeNull()
  })
})

describe('collectDisputeCaseIds', () => {
  it('去重並維持出現順序', () => {
    const ids = collectDisputeCaseIds([
      evt('DisputeOpened', { caseId: 2n, subscriber: '0x1', evidenceHash: '0x' }),
      evt('VoteCommitted', { caseId: 2n, assessor: '0x1' }),
      evt('DisputeOpened', { caseId: 5n, subscriber: '0x2', evidenceHash: '0x' }),
    ])
    expect(ids).toEqual([2n, 5n])
  })
})

describe('reduceDisputeCases', () => {
  it('跨多案件摺疊並沿用既有狀態', () => {
    const existing = new Map<string, DisputeCaseState>([
      ['1', { ...emptyDisputeCase(1n), status: 4, committedCount: 1 }],
    ])
    const result = reduceDisputeCases(existing, [
      evt('VoteCommitted', { caseId: 1n, assessor: '0x9' }),
      evt('DisputeOpened', { caseId: 2n, subscriber: '0xabc', evidenceHash: '0xh' }, 3n),
    ])
    expect(result.get('1')!.committedCount).toBe(2)
    expect(result.get('1')!.status).toBe(4)
    expect(result.get('2')!.status).toBe(1)
  })

  it('同批多事件作用於同案件可累積', () => {
    const result = reduceDisputeCases(new Map(), [
      evt('DisputeOpened', { caseId: 1n, subscriber: '0xabc', evidenceHash: '0xh' }, 1n),
      evt('AssessorsRequested', { caseId: 1n, requestId: 1n, numAssessors: 3 }, 2n),
      evt('VotingStarted', { caseId: 1n, commitDeadline: 10n, revealDeadline: 20n, quorumBps: 5000n }, 3n),
      evt('VoteCommitted', { caseId: 1n, assessor: '0x1' }, 4n),
      evt('VoteCommitted', { caseId: 1n, assessor: '0x2' }, 4n),
    ])
    const s = result.get('1')!
    expect(s.status).toBe(4)
    expect(s.numAssessors).toBe(3)
    expect(s.committedCount).toBe(2)
  })
})

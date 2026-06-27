import {
  emptyDisputeCase,
  type DecodedEvent,
  type DisputeCaseState,
} from './events.js'

// 純投影函式：將 DisputeManager 事件摺疊為各案件狀態。無副作用，便於單元測試。
// 對應事件簽章（contracts/src/core/DisputeManager.sol）：
//   DisputeOpened(uint256 caseId, address subscriber, bytes32 evidenceHash)
//   AssessorsRequested(uint256 caseId, uint256 requestId, uint32 numAssessors)
//   AssessorsAssigned(uint256 caseId, address[] assessors)
//   VotingStarted(uint256 caseId, uint64 commitDeadline, uint64 revealDeadline, uint256 quorumBps)
//   VoteCommitted(uint256 caseId, address assessor)
//   VoteRevealed(uint256 caseId, address assessor, uint256 ratioBps)
//   CaseResolved(uint256 caseId, bool quorumMet, uint256 medianRatioBps, uint256 effectiveLoss)
//   AssessorNoShow(uint256 caseId, address assessor)

// CaseStatus 狀態碼（對齊合約 enum）。
const STATUS_EVIDENCE = 1
const STATUS_AWAITING_RANDOMNESS = 2
const STATUS_ASSIGNED = 3
const STATUS_VOTING = 4
const STATUS_RESOLVED = 5

export const DISPUTE_EVENT_NAMES: ReadonlySet<string> = new Set([
  'DisputeOpened',
  'AssessorsRequested',
  'AssessorsAssigned',
  'VotingStarted',
  'VoteCommitted',
  'VoteRevealed',
  'CaseResolved',
  'AssessorNoShow',
])

function asBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' || typeof value === 'string') return BigInt(value)
  throw new Error(`預期 bigint 相容值，實得：${typeof value}`)
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number(value)
  throw new Error(`預期 number 相容值，實得：${typeof value}`)
}

// 取得事件的 caseId（DisputeManager 事件第一個參數恆為 caseId）。
export function caseIdOf(event: DecodedEvent): bigint | null {
  if (!DISPUTE_EVENT_NAMES.has(event.eventName)) return null
  if (event.args.caseId === undefined) return null
  return asBigInt(event.args.caseId)
}

export function foldDisputeCase(state: DisputeCaseState, event: DecodedEvent): DisputeCaseState {
  const next = { ...state, updatedBlock: event.blockNumber }
  switch (event.eventName) {
    case 'DisputeOpened':
      return {
        ...next,
        subscriber: String(event.args.subscriber).toLowerCase(),
        evidenceHash: String(event.args.evidenceHash),
        status: STATUS_EVIDENCE,
        openedBlock: event.blockNumber,
      }
    case 'AssessorsRequested':
      return {
        ...next,
        status: STATUS_AWAITING_RANDOMNESS,
        requestId: asBigInt(event.args.requestId),
        numAssessors: asNumber(event.args.numAssessors),
      }
    case 'AssessorsAssigned': {
      const assessors = Array.isArray(event.args.assessors) ? event.args.assessors : []
      return { ...next, status: STATUS_ASSIGNED, assignedCount: assessors.length }
    }
    case 'VotingStarted':
      return {
        ...next,
        status: STATUS_VOTING,
        commitDeadline: asBigInt(event.args.commitDeadline),
        revealDeadline: asBigInt(event.args.revealDeadline),
        quorumBps: asBigInt(event.args.quorumBps),
      }
    case 'VoteCommitted':
      return { ...next, committedCount: state.committedCount + 1 }
    case 'VoteRevealed':
      return { ...next, revealedCount: state.revealedCount + 1 }
    case 'CaseResolved':
      return {
        ...next,
        status: STATUS_RESOLVED,
        quorumMet: Boolean(event.args.quorumMet),
        medianRatioBps: asBigInt(event.args.medianRatioBps),
        effectiveLoss: asBigInt(event.args.effectiveLoss),
        resolvedBlock: event.blockNumber,
      }
    case 'AssessorNoShow':
      return { ...next, noShowCount: state.noShowCount + 1 }
    default:
      return state
  }
}

// 蒐集一批事件中受影響的案件 ID（去重，維持出現順序）。
export function collectDisputeCaseIds(events: readonly DecodedEvent[]): bigint[] {
  const seen = new Set<string>()
  const ids: bigint[] = []
  for (const event of events) {
    const id = caseIdOf(event)
    if (id === null) continue
    const key = id.toString()
    if (seen.has(key)) continue
    seen.add(key)
    ids.push(id)
  }
  return ids
}

/**
 * 將一批事件摺疊到既有案件狀態映射（keyed by caseId 字串）。
 * initial 應包含本批所有受影響案件的目前狀態（不存在者以 emptyDisputeCase 起始）。
 * 回傳僅含本批有更新的案件狀態映射。
 */
export function reduceDisputeCases(
  initial: ReadonlyMap<string, DisputeCaseState>,
  events: readonly DecodedEvent[],
): Map<string, DisputeCaseState> {
  const result = new Map<string, DisputeCaseState>()
  for (const event of events) {
    const id = caseIdOf(event)
    if (id === null) continue
    const key = id.toString()
    const current = result.get(key) ?? initial.get(key) ?? emptyDisputeCase(id)
    result.set(key, foldDisputeCase(current, event))
  }
  return result
}

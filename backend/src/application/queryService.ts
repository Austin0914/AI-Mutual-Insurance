import type { Pool } from 'pg'
import type { PublicClient } from 'viem'
import type { DisputeCaseState } from '../domain/events.js'
import { getCheckpoint } from '../infrastructure/db/checkpoints.js'
import { getFundStatus, getSlashedTotals } from '../infrastructure/db/projectionsRepo.js'
import { getDisputeByCaseId, getDisputeList } from '../infrastructure/db/disputesRepo.js'

// 查詢用例編排：讀索引器投影表，組成可序列化（bigint→string）的 API 視圖。
// 所有金額/區塊以字串輸出，避免 JS number 精度問題。

export interface QueryDeps {
  pool: Pool
  client: PublicClient
  chainId: number
}

export interface HealthView {
  chainId: number
  lastSafeBlock: string | null
  latestBlock: string
  lag: string
  caughtUp: boolean
}

export async function getHealthView(deps: QueryDeps): Promise<HealthView> {
  const { pool, client, chainId } = deps
  const [checkpoint, latestBlock] = await Promise.all([
    getCheckpoint(pool, chainId),
    client.getBlockNumber(),
  ])
  const lag = checkpoint === null ? latestBlock : latestBlock > checkpoint ? latestBlock - checkpoint : 0n
  return {
    chainId,
    lastSafeBlock: checkpoint === null ? null : checkpoint.toString(),
    latestBlock: latestBlock.toString(),
    lag: lag.toString(),
    caughtUp: checkpoint !== null && lag === 0n,
  }
}

export interface FundStatusView {
  chainId: number
  lastSafeBlock: string | null
  fund: {
    totalContributed: string
    totalPaidOut: string
    poolBalance: string
    active: boolean
    launch: { nMin: string; dMin: string; hhiMaxBps: string; etaMaxBps: string }
  } | null
}

export async function getFundStatusView(deps: QueryDeps): Promise<FundStatusView> {
  const { pool, chainId } = deps
  const [checkpoint, fund] = await Promise.all([
    getCheckpoint(pool, chainId),
    getFundStatus(pool, chainId),
  ])
  return {
    chainId,
    lastSafeBlock: checkpoint === null ? null : checkpoint.toString(),
    fund:
      fund === null
        ? null
        : {
            totalContributed: fund.totalContributed.toString(),
            totalPaidOut: fund.totalPaidOut.toString(),
            poolBalance: fund.poolBalance.toString(),
            active: fund.active,
            launch: {
              nMin: fund.nMin.toString(),
              dMin: fund.dMin.toString(),
              hhiMaxBps: fund.hhiMaxBps.toString(),
              etaMaxBps: fund.etaMaxBps.toString(),
            },
          },
  }
}

export interface SlashedView {
  chainId: number
  lastSafeBlock: string | null
  assessors: Array<{ assessor: string; totalSlashed: string }>
}

export async function getSlashedView(deps: QueryDeps): Promise<SlashedView> {
  const { pool, chainId } = deps
  const [checkpoint, totals] = await Promise.all([
    getCheckpoint(pool, chainId),
    getSlashedTotals(pool, chainId),
  ])
  return {
    chainId,
    lastSafeBlock: checkpoint === null ? null : checkpoint.toString(),
    assessors: totals.map((t) => ({ assessor: t.assessor, totalSlashed: t.totalSlashed.toString() })),
  }
}

// 案件狀態碼 → 可讀標籤（對齊合約 CaseStatus）。
const CASE_STATUS_LABELS = [
  'None',
  'Evidence',
  'AwaitingRandomness',
  'Assigned',
  'Voting',
  'Resolved',
] as const

export interface DisputeView {
  caseId: string
  subscriber: string
  evidenceHash: string
  status: number
  statusLabel: string
  requestId: string
  numAssessors: number
  assignedCount: number
  commitDeadline: string
  revealDeadline: string
  quorumBps: string
  committedCount: number
  revealedCount: number
  noShowCount: number
  quorumMet: boolean | null
  medianRatioBps: string
  effectiveLoss: string
  openedBlock: string
  resolvedBlock: string | null
  updatedBlock: string
}

function toDisputeView(c: DisputeCaseState): DisputeView {
  return {
    caseId: c.caseId.toString(),
    subscriber: c.subscriber,
    evidenceHash: c.evidenceHash,
    status: c.status,
    statusLabel: CASE_STATUS_LABELS[c.status] ?? 'Unknown',
    requestId: c.requestId.toString(),
    numAssessors: c.numAssessors,
    assignedCount: c.assignedCount,
    commitDeadline: c.commitDeadline.toString(),
    revealDeadline: c.revealDeadline.toString(),
    quorumBps: c.quorumBps.toString(),
    committedCount: c.committedCount,
    revealedCount: c.revealedCount,
    noShowCount: c.noShowCount,
    quorumMet: c.quorumMet,
    medianRatioBps: c.medianRatioBps.toString(),
    effectiveLoss: c.effectiveLoss.toString(),
    openedBlock: c.openedBlock.toString(),
    resolvedBlock: c.resolvedBlock === null ? null : c.resolvedBlock.toString(),
    updatedBlock: c.updatedBlock.toString(),
  }
}

export interface DisputeListView {
  chainId: number
  lastSafeBlock: string | null
  limit: number
  offset: number
  disputes: DisputeView[]
}

export async function getDisputesView(
  deps: QueryDeps,
  limit: number,
  offset: number,
): Promise<DisputeListView> {
  const { pool, chainId } = deps
  const [checkpoint, cases] = await Promise.all([
    getCheckpoint(pool, chainId),
    getDisputeList(pool, chainId, limit, offset),
  ])
  return {
    chainId,
    lastSafeBlock: checkpoint === null ? null : checkpoint.toString(),
    limit,
    offset,
    disputes: cases.map(toDisputeView),
  }
}

export interface DisputeDetailView {
  chainId: number
  lastSafeBlock: string | null
  dispute: DisputeView | null
}

export async function getDisputeView(deps: QueryDeps, caseId: bigint): Promise<DisputeDetailView> {
  const { pool, chainId } = deps
  const [checkpoint, found] = await Promise.all([
    getCheckpoint(pool, chainId),
    getDisputeByCaseId(pool, chainId, caseId),
  ])
  return {
    chainId,
    lastSafeBlock: checkpoint === null ? null : checkpoint.toString(),
    dispute: found === null ? null : toDisputeView(found),
  }
}

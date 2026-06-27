import type { PoolClient } from 'pg'
import type { DecodedEvent } from '../domain/events.js'
import { reduceFundStatus, reduceSlashIncrements } from '../domain/projection.js'
import { collectDisputeCaseIds, reduceDisputeCases } from '../domain/disputeProjection.js'
import {
  getFundStatusForUpdate,
  incrementSlashedTotals,
  upsertFundStatus,
} from '../infrastructure/db/projectionsRepo.js'
import {
  getDisputeCasesForUpdate,
  upsertDisputeCases,
} from '../infrastructure/db/disputesRepo.js'

/**
 * 將一批事件套用到投影（用例編排）。
 * 必須在與 raw_events 寫入相同的交易中呼叫，確保事實與投影一致。
 */
export async function applyProjections(
  client: PoolClient,
  chainId: number,
  events: readonly DecodedEvent[],
): Promise<void> {
  if (events.length === 0) return

  // FundStatus：載入（行鎖）→ 純摺疊 → 寫回。
  const current = await getFundStatusForUpdate(client, chainId)
  const next = reduceFundStatus(current, events)
  await upsertFundStatus(client, chainId, next)

  // 罰沒彙總：依 assessor 累加增量。
  const slashed = reduceSlashIncrements(events)
  if (slashed.size > 0) {
    await incrementSlashedTotals(client, chainId, slashed)
  }

  // 爭議案件：載入本批受影響案件（行鎖）→ 純摺疊 → 寫回。
  const caseIds = collectDisputeCaseIds(events)
  if (caseIds.length > 0) {
    const existing = await getDisputeCasesForUpdate(client, chainId, caseIds)
    const updated = reduceDisputeCases(existing, events)
    await upsertDisputeCases(client, chainId, updated.values())
  }
}

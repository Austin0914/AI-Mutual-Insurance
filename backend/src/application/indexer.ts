import type { Pool } from 'pg'
import type { PublicClient } from 'viem'
import type { Logger } from '../infrastructure/logger.js'
import type { MonitoredContract } from '../infrastructure/chain/contracts.js'
import { fetchDecodedLogs } from '../infrastructure/chain/logs.js'
import { withTransaction } from '../infrastructure/db/pool.js'
import { getCheckpoint, setCheckpoint } from '../infrastructure/db/checkpoints.js'
import { insertRawEvents } from '../infrastructure/db/rawEvents.js'
import { applyProjections } from './projector.js'

export interface IndexerDeps {
  pool: Pool
  client: PublicClient
  contracts: MonitoredContract[]
  chainId: number
  startBlock: bigint
  confirmations: bigint
  maxBlockRange: bigint
  logger: Logger
}

export interface BatchResult {
  caughtUp: boolean
  fromBlock: bigint
  toBlock: bigint
  fetched: number
  inserted: number
  lastSafeBlock: bigint
  latestBlock: bigint
  lag: bigint
}

// 依 checkpoint 推算下一批的起始區塊。首次（無 checkpoint）從 startBlock 開始。
export function nextFromBlock(checkpoint: bigint | null, startBlock: bigint): bigint {
  return checkpoint === null ? startBlock : checkpoint + 1n
}

/**
 * 處理下一批區間。流程：
 *   讀 checkpoint → 算 fromBlock / toBlock（latest - confirmations）→ 抓 logs
 *   → 單一交易內：寫 raw_events（冪等）+ 套用投影 + 推進 checkpoint。
 * 已追上安全頭部時回傳 caughtUp=true（不寫入）。
 */
export async function processNextBatch(deps: IndexerDeps): Promise<BatchResult> {
  const { pool, client, contracts, chainId, startBlock, confirmations, maxBlockRange, logger } = deps

  const latestBlock = await client.getBlockNumber()
  const safeHead = latestBlock >= confirmations ? latestBlock - confirmations : -1n

  const checkpoint = await getCheckpoint(pool, chainId)
  const fromBlock = nextFromBlock(checkpoint, startBlock)
  const lastSafeBlock = checkpoint ?? (startBlock > 0n ? startBlock - 1n : 0n)

  // 尚無可安全處理的新區塊。
  if (safeHead < fromBlock) {
    return {
      caughtUp: true,
      fromBlock,
      toBlock: safeHead,
      fetched: 0,
      inserted: 0,
      lastSafeBlock,
      latestBlock,
      lag: safeHead >= lastSafeBlock ? safeHead - lastSafeBlock : 0n,
    }
  }

  // 限制單批掃描範圍。
  const maxToBlock = fromBlock + maxBlockRange - 1n
  const toBlock = safeHead < maxToBlock ? safeHead : maxToBlock

  const events = await fetchDecodedLogs(client, contracts, fromBlock, toBlock)

  const inserted = await withTransaction(pool, async (tx) => {
    const insertedCount = await insertRawEvents(tx, chainId, events)
    await applyProjections(tx, chainId, events)
    await setCheckpoint(tx, chainId, toBlock)
    return insertedCount
  })

  logger.info(
    {
      chainId,
      fromBlock: fromBlock.toString(),
      toBlock: toBlock.toString(),
      fetched: events.length,
      inserted,
    },
    '已處理批次',
  )

  return {
    caughtUp: toBlock >= safeHead,
    fromBlock,
    toBlock,
    fetched: events.length,
    inserted,
    lastSafeBlock: toBlock,
    latestBlock,
    lag: latestBlock - toBlock,
  }
}

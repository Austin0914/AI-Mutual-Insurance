import type { PublicClient } from 'viem'
import type { MonitoredContract } from './contracts.js'
import type { DecodedEvent } from '../../domain/events.js'

function normalizeArgs(args: unknown): Record<string, unknown> {
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    return args as Record<string, unknown>
  }
  return {}
}

/**
 * 抓取 [fromBlock, toBlock] 區間內所有受監聽合約的事件，並解碼為 DecodedEvent。
 * 結果依 (blockNumber, logIndex) 排序，確保投影套用順序與鏈上一致。
 */
export async function fetchDecodedLogs(
  client: PublicClient,
  contracts: readonly MonitoredContract[],
  fromBlock: bigint,
  toBlock: bigint,
): Promise<DecodedEvent[]> {
  const all: DecodedEvent[] = []

  for (const contract of contracts) {
    if (contract.events.length === 0) continue
    const logs = await client.getLogs({
      address: contract.address,
      events: contract.events,
      fromBlock,
      toBlock,
    })
    for (const log of logs) {
      if (
        log.blockNumber === null ||
        log.blockHash === null ||
        log.transactionHash === null ||
        log.logIndex === null
      ) {
        // 跳過 pending log（理論上 toBlock 已扣除 confirmations 不應發生）。
        continue
      }
      all.push({
        contractName: contract.name,
        eventName: (log as { eventName?: string }).eventName ?? 'unknown',
        address: log.address,
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        args: normalizeArgs((log as { args?: unknown }).args),
      })
    }
  }

  all.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1
    return a.logIndex - b.logIndex
  })
  return all
}

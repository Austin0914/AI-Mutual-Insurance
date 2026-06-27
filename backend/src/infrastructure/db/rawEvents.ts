import type { PoolClient } from 'pg'
import type { DecodedEvent } from '../../domain/events.js'

// JSON 序列化時將 bigint 轉為字串，避免 JSONB 無法表示大整數。
function serializeArgs(args: Record<string, unknown>): string {
  return JSON.stringify(args, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  )
}

/**
 * 將一批 log 寫入 raw_events。
 * 以唯一鍵 (chain_id, tx_hash, log_index) 搭配 ON CONFLICT DO NOTHING 保證冪等。
 * 回傳實際新增的筆數。
 */
export async function insertRawEvents(
  client: PoolClient,
  chainId: number,
  events: readonly DecodedEvent[],
): Promise<number> {
  let inserted = 0
  for (const e of events) {
    const res = await client.query(
      `INSERT INTO raw_events
         (chain_id, block_number, block_hash, tx_hash, log_index,
          address, contract_name, event_name, args)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (chain_id, tx_hash, log_index) DO NOTHING`,
      [
        chainId,
        e.blockNumber.toString(),
        e.blockHash,
        e.txHash,
        e.logIndex,
        e.address.toLowerCase(),
        e.contractName,
        e.eventName,
        serializeArgs(e.args),
      ],
    )
    inserted += res.rowCount ?? 0
  }
  return inserted
}

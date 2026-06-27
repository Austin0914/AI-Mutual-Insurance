import type { Pool, PoolClient } from 'pg'

type Queryable = Pool | PoolClient

// 讀取某條鏈已安全處理到的最後區塊；尚無紀錄時回傳 null。
export async function getCheckpoint(db: Queryable, chainId: number): Promise<bigint | null> {
  const res = await db.query<{ last_safe_block: string }>(
    'SELECT last_safe_block FROM checkpoints WHERE chain_id = $1',
    [chainId],
  )
  if (res.rowCount === 0) return null
  return BigInt(res.rows[0].last_safe_block)
}

// 寫入/更新 checkpoint（須在 ingest 同一交易中呼叫以維持一致性）。
export async function setCheckpoint(
  client: PoolClient,
  chainId: number,
  lastSafeBlock: bigint,
): Promise<void> {
  await client.query(
    `INSERT INTO checkpoints (chain_id, last_safe_block, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (chain_id)
     DO UPDATE SET last_safe_block = EXCLUDED.last_safe_block, updated_at = now()`,
    [chainId, lastSafeBlock.toString()],
  )
}

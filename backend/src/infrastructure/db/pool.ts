import { Pool } from 'pg'
import type { PoolClient } from 'pg'

// 共享 PostgreSQL 連線池（infrastructure 轉接頭）。
export function createPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl })
}

/**
 * 在單一交易中執行 fn。fn 拋錯時 ROLLBACK，否則 COMMIT。
 * 用於確保「寫 raw_events + 套用投影 + 推進 checkpoint」的原子一致性。
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

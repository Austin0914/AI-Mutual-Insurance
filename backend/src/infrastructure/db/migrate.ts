import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { loadConfig } from '../../config.js'
import { createLogger } from '../logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// backend/src/infrastructure/db -> backend/migrations
const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'migrations')

// 最小日誌介面，相容 pino 與 console。
interface MinimalLogger {
  info?: (msg: string) => void
}

/**
 * 極簡 SQL migration runner（零額外依賴）。
 * 依檔名排序執行 migrations/*.sql，並以 schema_migrations 記錄已套用者以求冪等。
 */
export async function runMigrations(pool: Pool, log: MinimalLogger = console): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

  for (const file of files) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file])
    if ((applied.rowCount ?? 0) > 0) {
      log.info?.(`migration 已套用，略過：${file}`)
      continue
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      log.info?.(`migration 已套用：${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}

// 允許以 `pnpm --filter @ai-insurance/backend migrate` 直接執行。
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isDirectRun) {
  const config = loadConfig()
  const logger = createLogger(config.logLevel)
  const pool = new Pool({ connectionString: config.databaseUrl })
  runMigrations(pool, logger)
    .then(() => logger.info('所有 migration 完成'))
    .catch((err) => {
      logger.error({ err }, 'migration 失敗')
      process.exitCode = 1
    })
    .finally(() => pool.end())
}

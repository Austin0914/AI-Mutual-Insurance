import 'dotenv/config'
import { z } from 'zod'

// 以 zod 在系統邊界驗證環境變數，失敗即早退，避免錯誤組態進入索引流程。
const envSchema = z.object({
  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  START_BLOCK: z.coerce.number().int().nonnegative().default(0),
  CONFIRMATIONS: z.coerce.number().int().nonnegative().default(1),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(4000),
  MAX_BLOCK_RANGE: z.coerce.number().int().positive().default(2000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  HTTP_PORT: z.coerce.number().int().positive().default(4000),
  HTTP_HOST: z.string().min(1).default('127.0.0.1'),
  // 允許跨來源讀取的前端來源（逗號分隔）；'*' 代表全部放行。
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
})

export type AppConfig = Readonly<{
  rpcUrl: string
  chainId: number
  databaseUrl: string
  startBlock: bigint
  confirmations: bigint
  pollIntervalMs: number
  maxBlockRange: bigint
  logLevel: string
  httpPort: number
  httpHost: string
  corsOrigin: string
}>

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`環境變數驗證失敗：${issues}`)
  }
  const env = parsed.data
  return {
    rpcUrl: env.RPC_URL,
    chainId: env.CHAIN_ID,
    databaseUrl: env.DATABASE_URL,
    startBlock: BigInt(env.START_BLOCK),
    confirmations: BigInt(env.CONFIRMATIONS),
    pollIntervalMs: env.POLL_INTERVAL_MS,
    maxBlockRange: BigInt(env.MAX_BLOCK_RANGE),
    logLevel: env.LOG_LEVEL,
    httpPort: env.HTTP_PORT,
    httpHost: env.HTTP_HOST,
    corsOrigin: env.CORS_ORIGIN,
  }
}

import { loadConfig } from './config.js'
import { createLogger } from './infrastructure/logger.js'
import { createPool } from './infrastructure/db/pool.js'
import { runMigrations } from './infrastructure/db/migrate.js'
import { createChainClient } from './infrastructure/chain/client.js'
import { loadMonitoredContracts } from './infrastructure/chain/contracts.js'
import { startApiServer } from './infrastructure/http/server.js'
import { processNextBatch, type IndexerDeps } from './application/indexer.js'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main(): Promise<void> {
  const config = loadConfig()
  const logger = createLogger(config.logLevel)

  const pool = createPool(config.databaseUrl)
  const client = createChainClient(config.rpcUrl)

  // 啟動時確保 schema 就緒。
  await runMigrations(pool, logger)

  const { contracts, missing } = loadMonitoredContracts(config.chainId)
  if (missing.length > 0) {
    logger.warn({ missing }, '部分合約在此鏈尚無位址，將略過監聽')
  }
  if (contracts.length === 0) {
    throw new Error(`鏈 ${config.chainId} 上找不到任何可監聽的合約位址`)
  }
  logger.info(
    { chainId: config.chainId, contracts: contracts.map((c) => `${c.name}@${c.address}`) },
    '索引器啟動',
  )

  const deps: IndexerDeps = {
    pool,
    client,
    contracts,
    chainId: config.chainId,
    startBlock: config.startBlock,
    confirmations: config.confirmations,
    maxBlockRange: config.maxBlockRange,
    logger,
  }

  // 與索引器同進程啟動唯讀查詢 API（供前端讀取投影）。
  const apiServer = await startApiServer(
    {
      pool,
      client,
      chainId: config.chainId,
      corsOrigin: config.corsOrigin,
      logger,
    },
    config.httpHost,
    config.httpPort,
  )

  let shuttingDown = false
  const shutdown = (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, '收到關閉訊號，準備結束')
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  const maxBackoffMs = 30_000
  let backoffMs = config.pollIntervalMs

  // 主輪詢迴圈。
  while (!shuttingDown) {
    try {
      const result = await processNextBatch(deps)
      backoffMs = config.pollIntervalMs // 成功後重置退避

      // 健康狀態輸出。
      logger.debug(
        {
          lastSafeBlock: result.lastSafeBlock.toString(),
          latestBlock: result.latestBlock.toString(),
          lag: result.lag.toString(),
          caughtUp: result.caughtUp,
        },
        'health',
      )

      // 追上鏈頭就等待輪詢間隔；否則立即抓下一批。
      if (result.caughtUp) {
        await sleep(config.pollIntervalMs)
      }
    } catch (err) {
      logger.error({ err, backoffMs }, '批次處理失敗，將退避重試')
      await sleep(backoffMs)
      backoffMs = Math.min(backoffMs * 2, maxBackoffMs) // 指數退避
    }
  }

  await new Promise<void>((resolve) => apiServer.close(() => resolve()))
  await pool.end()
  logger.info('索引器已結束')
}

main().catch((err) => {
  // 啟動期致命錯誤。
  console.error('索引器啟動失敗：', err)
  process.exitCode = 1
})

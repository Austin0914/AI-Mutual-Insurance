import { pino } from 'pino'

// 結構化日誌（pino）。非 production 預設使用 pino-pretty 提升本地可讀性。
export function createLogger(level: string) {
  const isProd = process.env.NODE_ENV === 'production'
  return pino({
    level,
    transport: isProd
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
        },
  })
}

export type Logger = ReturnType<typeof createLogger>

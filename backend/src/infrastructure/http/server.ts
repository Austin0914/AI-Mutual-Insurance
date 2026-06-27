import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { Pool } from 'pg'
import type { PublicClient } from 'viem'
import type { Logger } from '../logger.js'
import {
  getDisputeView,
  getDisputesView,
  getFundStatusView,
  getHealthView,
  getSlashedView,
  type QueryDeps,
} from '../../application/queryService.js'

export interface ApiDeps {
  pool: Pool
  client: PublicClient
  chainId: number
  corsOrigin: string
  logger: Logger
}

interface RouteMatch {
  params: Record<string, string>
}

type RouteHandler = (
  deps: ApiDeps,
  match: RouteMatch,
  url: URL,
) => Promise<{ status: number; body: unknown }>

interface Route {
  method: string
  pattern: RegExp
  handler: RouteHandler
}

// 以具名群組的正則描述路徑；:param 轉為 (?<param>[^/]+)。
function route(method: string, path: string, handler: RouteHandler): Route {
  const pattern = new RegExp(
    '^' + path.replace(/:[a-zA-Z]+/g, (m) => `(?<${m.slice(1)}>[^/]+)`) + '/?$',
  )
  return { method, pattern, handler }
}

const routes: Route[] = [
  route('GET', '/api/v1/health', async (deps) => ({
    status: 200,
    body: await getHealthView(toQueryDeps(deps)),
  })),
  route('GET', '/api/v1/fund/status', async (deps) => ({
    status: 200,
    body: await getFundStatusView(toQueryDeps(deps)),
  })),
  route('GET', '/api/v1/assessors/slashed', async (deps) => ({
    status: 200,
    body: await getSlashedView(toQueryDeps(deps)),
  })),
  route('GET', '/api/v1/disputes', async (deps, _match, url) => {
    const limit = parseIntParam(url.searchParams.get('limit'), 20, 100)
    const offset = parseIntParam(url.searchParams.get('offset'), 0, Number.MAX_SAFE_INTEGER)
    return { status: 200, body: await getDisputesView(toQueryDeps(deps), limit, offset) }
  }),
  route('GET', '/api/v1/disputes/:caseId', async (deps, match) => {
    const raw = match.params.caseId
    let caseId: bigint
    try {
      caseId = BigInt(raw)
    } catch {
      return { status: 400, body: { error: { code: 'BAD_REQUEST', message: `無效的 caseId：${raw}` } } }
    }
    const view = await getDisputeView(toQueryDeps(deps), caseId)
    if (view.dispute === null) {
      return { status: 404, body: { error: { code: 'NOT_FOUND', message: `找不到案件：${raw}` } } }
    }
    return { status: 200, body: view }
  }),
]

function toQueryDeps(deps: ApiDeps): QueryDeps {
  return { pool: deps.pool, client: deps.client, chainId: deps.chainId }
}

// 解析非負整數查詢參數，超出範圍時回退至預設值。
function parseIntParam(value: string | null, fallback: number, max: number): number {
  if (value === null) return fallback
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) return fallback
  return Math.min(n, max)
}

function applyCors(res: ServerResponse, origin: string): void {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(payload)
}

function sendError(res: ServerResponse, status: number, code: string, message: string): void {
  sendJson(res, status, { error: { code, message } })
}

async function handleRequest(
  deps: ApiDeps,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  applyCors(res, deps.corsOrigin)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const method = req.method ?? 'GET'

  let pathMatched = false
  for (const r of routes) {
    const m = r.pattern.exec(url.pathname)
    if (!m) continue
    pathMatched = true
    if (r.method !== method) continue
    try {
      const { status, body } = await r.handler(deps, { params: m.groups ?? {} }, url)
      sendJson(res, status, body)
    } catch (err) {
      deps.logger.error({ err, path: url.pathname }, 'API 處理失敗')
      sendError(res, 500, 'INTERNAL_ERROR', '伺服器內部錯誤')
    }
    return
  }

  if (pathMatched) {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', `不支援的方法：${method}`)
  } else {
    sendError(res, 404, 'NOT_FOUND', `找不到資源：${url.pathname}`)
  }
}

/** 建立查詢 API 伺服器（唯讀，讀索引器投影）。呼叫端負責 listen/close。 */
export function createApiServer(deps: ApiDeps): Server {
  return createServer((req, res) => {
    void handleRequest(deps, req, res)
  })
}

/** 啟動 API 伺服器並回傳已就緒的 Server。 */
export function startApiServer(deps: ApiDeps, host: string, port: number): Promise<Server> {
  const server = createApiServer(deps)
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, () => {
      server.removeListener('error', reject)
      deps.logger.info({ host, port }, '查詢 API 已啟動')
      resolve(server)
    })
  })
}

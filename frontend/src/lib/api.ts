// 後端索引器查詢 API 客戶端。
// 提供鏈上「拿不到 / 成本高」的資料：跨案件歷史統計、各鑑定者罰沒彙總、索引器新鮮度。
// 即時資金 / 單案狀態仍由 wagmi 直接讀鏈為權威來源。

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

export interface HealthResponse {
  chainId: number
  lastSafeBlock: string | null
  latestBlock: string
  lag: string
  caughtUp: boolean
}

export interface FundStatusResponse {
  chainId: number
  lastSafeBlock: string | null
  fund: {
    totalContributed: string
    totalPaidOut: string
    poolBalance: string
    active: boolean
    launch: { nMin: string; dMin: string; hhiMaxBps: string; etaMaxBps: string }
  } | null
}

export interface SlashedResponse {
  chainId: number
  lastSafeBlock: string | null
  assessors: Array<{ assessor: string; totalSlashed: string }>
}

export interface DisputeRecord {
  caseId: string
  subscriber: string
  evidenceHash: string
  status: number
  statusLabel: string
  requestId: string
  numAssessors: number
  assignedCount: number
  commitDeadline: string
  revealDeadline: string
  quorumBps: string
  committedCount: number
  revealedCount: number
  noShowCount: number
  quorumMet: boolean | null
  medianRatioBps: string
  effectiveLoss: string
  openedBlock: string
  resolvedBlock: string | null
  updatedBlock: string
}

export interface DisputeListResponse {
  chainId: number
  lastSafeBlock: string | null
  limit: number
  offset: number
  disputes: DisputeRecord[]
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    let message = `API ${res.status}`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      if (body?.error?.message) message = body.error.message
    } catch {
      // 忽略非 JSON 錯誤主體。
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export const indexerApi = {
  baseUrl: API_BASE,
  health: (signal?: AbortSignal) => getJson<HealthResponse>('/api/v1/health', signal),
  fundStatus: (signal?: AbortSignal) => getJson<FundStatusResponse>('/api/v1/fund/status', signal),
  slashed: (signal?: AbortSignal) => getJson<SlashedResponse>('/api/v1/assessors/slashed', signal),
  disputes: (limit = 50, offset = 0, signal?: AbortSignal) =>
    getJson<DisputeListResponse>(`/api/v1/disputes?limit=${limit}&offset=${offset}`, signal),
  dispute: (caseId: string, signal?: AbortSignal) =>
    getJson<DisputeListResponse['disputes'][number]>(`/api/v1/disputes/${caseId}`, signal),
}

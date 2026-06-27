'use client'

import { useQuery } from '@tanstack/react-query'

import { CASE_STATUS_LABELS } from '@/hooks/useDisputes'
import {
  indexerApi,
  type DisputeListResponse,
  type HealthResponse,
  type SlashedResponse,
} from '@/lib/api'

// 索引器資料採低頻輪詢；後端落後鏈頭數秒屬正常，毋須即時。
const REFETCH_MS = 8000

export function useIndexerHealth() {
  const query = useQuery<HealthResponse>({
    queryKey: ['indexer', 'health'],
    queryFn: ({ signal }) => indexerApi.health(signal),
    refetchInterval: REFETCH_MS,
    retry: 1,
  })
  return {
    online: query.isSuccess,
    health: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

export function useSlashedBreakdown() {
  const query = useQuery<SlashedResponse>({
    queryKey: ['indexer', 'slashed'],
    queryFn: ({ signal }) => indexerApi.slashed(signal),
    refetchInterval: REFETCH_MS,
    retry: 1,
  })
  return {
    online: query.isSuccess,
    assessors: query.data?.assessors ?? [],
    lastSafeBlock: query.data?.lastSafeBlock ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

/**
 * 自索引器讀取「完整」爭議案件歷史（非僅近 5 筆鏈上讀取），
 * 並彙總各狀態案件數。索引器離線時 online=false，呼叫端可回退鏈上資料。
 */
export function useDisputeHistory(limit = 50) {
  const query = useQuery<DisputeListResponse>({
    queryKey: ['indexer', 'disputes', limit],
    queryFn: ({ signal }) => indexerApi.disputes(limit, 0, signal),
    refetchInterval: REFETCH_MS,
    retry: 1,
  })

  const disputes = query.data?.disputes ?? []
  const counts = disputes.reduce<Record<string, number>>((acc, d) => {
    const label = CASE_STATUS_LABELS[d.status] ?? 'Unknown'
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})

  return {
    online: query.isSuccess,
    disputes,
    counts,
    total: disputes.length,
    lastSafeBlock: query.data?.lastSafeBlock ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

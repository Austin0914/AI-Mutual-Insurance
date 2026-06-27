'use client'

import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'

import { disputeManagerConfig } from '@/lib/contracts'

export const CASE_STATUS_LABELS = ['None', 'Evidence', 'AwaitingRandomness', 'Assigned', 'Voting', 'Resolved'] as const

export interface DisputeCaseSummary {
  caseId: bigint
  subscriber: `0x${string}`
  loss: bigint
  deductibleBps: bigint
  coverageK: bigint
  evidenceHash: `0x${string}`
  status: number
  numAssessors: number
  commitDeadline: bigint
  revealDeadline: bigint
  quorumBps: bigint
  slashBps: bigint
  totalWeight: bigint
  revealedWeight: bigint
}

function normalizeCase(caseId: bigint, raw: unknown): DisputeCaseSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  return {
    caseId,
    subscriber: value.subscriber as `0x${string}`,
    loss: value.loss as bigint,
    deductibleBps: value.deductibleBps as bigint,
    coverageK: value.coverageK as bigint,
    evidenceHash: value.evidenceHash as `0x${string}`,
    status: Number(value.status ?? 0),
    numAssessors: Number(value.numAssessors ?? 0),
    commitDeadline: value.commitDeadline as bigint,
    revealDeadline: value.revealDeadline as bigint,
    quorumBps: value.quorumBps as bigint,
    slashBps: value.slashBps as bigint,
    totalWeight: value.totalWeight as bigint,
    revealedWeight: value.revealedWeight as bigint,
  }
}

export function useRecentDisputes(limit = 5) {
  const ready = Boolean(disputeManagerConfig)

  const nextCaseIdQuery = useReadContract({
    ...disputeManagerConfig!,
    functionName: 'nextCaseId',
    query: { enabled: ready },
  })

  const nextCaseId = nextCaseIdQuery.data as bigint | undefined

  const caseIds = useMemo(() => {
    if (nextCaseId === undefined || nextCaseId === 0n) return []
    const count = Number(nextCaseId > BigInt(limit) ? BigInt(limit) : nextCaseId)
    return Array.from({ length: count }, (_, index) => nextCaseId - 1n - BigInt(index))
  }, [limit, nextCaseId])

  const contracts = useMemo(
    () =>
      ready
        ? caseIds.map((caseId) => ({
            ...disputeManagerConfig!,
            functionName: 'getCase',
            args: [caseId],
          }))
        : [],
    [caseIds, ready],
  )

  const casesQuery = useReadContracts({
    contracts: contracts as never,
    query: { enabled: ready && caseIds.length > 0 },
  })

  const cases = useMemo(() => {
    const results = (casesQuery.data ?? []) as Array<{ result?: unknown }>
    return results
      .map((entry, index) => normalizeCase(caseIds[index]!, entry.result))
      .filter((entry): entry is DisputeCaseSummary => Boolean(entry))
  }, [caseIds, casesQuery.data])

  const counts = useMemo(() => {
    return cases.reduce<Record<string, number>>((acc, item) => {
      const label = CASE_STATUS_LABELS[item.status] ?? 'Unknown'
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {})
  }, [cases])

  return {
    cases,
    counts,
    nextCaseId,
    notDeployed: !ready,
    isLoading: nextCaseIdQuery.isLoading || casesQuery.isLoading,
    isError: nextCaseIdQuery.isError || casesQuery.isError,
  }
}

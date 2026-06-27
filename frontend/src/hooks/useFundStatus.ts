'use client'

import { useReadContracts } from 'wagmi'

import { assessorRegistryConfig, fundVaultConfig } from '@/lib/contracts'

export interface LaunchStatus {
  meetsParticipants?: boolean
  meetsDeposit?: boolean
  meetsConcentration?: boolean
  meetsShare?: boolean
  canActivate?: boolean
  concentrationBps?: bigint
  shareBps?: bigint
}

export interface FundStatus {
  active?: boolean
  token?: `0x${string}`
  totalContributed?: bigint
  totalPaidOut?: bigint
  poolBalance?: bigint
  participantCount?: bigint
  launchStatus?: LaunchStatus
  assessorCount?: bigint
  totalSlashed?: bigint
}

/**
 * 批次唯讀基金狀態：FundVault + AssessorRegistry 的 demo dashboard 基礎資料。
 * 合約位址尚未部署到本鏈時回傳 notDeployed=true；RPC 無法連線時 isError=true。
 */
export function useFundStatus() {
  const ready = Boolean(fundVaultConfig && assessorRegistryConfig)

  const query = useReadContracts({
    contracts: ready
      ? [
          { ...fundVaultConfig!, functionName: 'active' },
          { ...fundVaultConfig!, functionName: 'token' },
          { ...fundVaultConfig!, functionName: 'totalContributed' },
          { ...fundVaultConfig!, functionName: 'totalPaidOut' },
          { ...fundVaultConfig!, functionName: 'poolBalance' },
          { ...fundVaultConfig!, functionName: 'participantCount' },
          { ...fundVaultConfig!, functionName: 'launchStatus' },
          { ...assessorRegistryConfig!, functionName: 'assessorCount' },
          { ...assessorRegistryConfig!, functionName: 'totalSlashed' },
        ]
      : [],
    query: { enabled: ready },
  })

  const [
    active,
    token,
    totalContributed,
    totalPaidOut,
    poolBalance,
    participantCount,
    launchStatus,
    assessorCount,
    totalSlashed,
  ] = query.data ?? []

  const status: FundStatus = {
    active: active?.result as boolean | undefined,
    token: token?.result as `0x${string}` | undefined,
    totalContributed: totalContributed?.result as bigint | undefined,
    totalPaidOut: totalPaidOut?.result as bigint | undefined,
    poolBalance: poolBalance?.result as bigint | undefined,
    participantCount: participantCount?.result as bigint | undefined,
    launchStatus: launchStatus?.result as LaunchStatus | undefined,
    assessorCount: assessorCount?.result as bigint | undefined,
    totalSlashed: totalSlashed?.result as bigint | undefined,
  }

  return {
    status,
    notDeployed: !ready,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

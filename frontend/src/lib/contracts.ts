import {
  addresses,
  assessorRegistryAbi,
  disputeManagerAbi,
  fundVaultAbi,
} from '@ai-insurance/abi'

import { CHAIN_ID } from './wagmi'

// 合約 ABI 與位址的唯一來源為 @ai-insurance/abi（由 contracts/ 衍生）。
// 此處以安全查表取代會丟錯的 getContractConfig，讓「尚未部署」能優雅降級為 UI 狀態。
export const deployedAddresses = addresses[CHAIN_ID] ?? {}

export const fundVaultConfig = deployedAddresses.FundVault
  ? ({ address: deployedAddresses.FundVault, abi: fundVaultAbi } as const)
  : undefined

export const assessorRegistryConfig = deployedAddresses.AssessorRegistry
  ? ({ address: deployedAddresses.AssessorRegistry, abi: assessorRegistryAbi } as const)
  : undefined

export const disputeManagerConfig = deployedAddresses.DisputeManager
  ? ({ address: deployedAddresses.DisputeManager, abi: disputeManagerAbi } as const)
  : undefined

/// UI 要列出的已部署合約（順序即顯示順序）。
export const CONTRACT_LABELS: Record<string, string> = {
  FundVault: '金庫 FundVault',
  AssessorRegistry: '鑑定者名冊 AssessorRegistry',
  DisputeManager: '爭議管理 DisputeManager',
  ChainlinkVRFAdapter: 'VRF 轉接 ChainlinkVRFAdapter',
}

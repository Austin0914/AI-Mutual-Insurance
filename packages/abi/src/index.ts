import {
  assessorRegistryAbi,
  chainlinkVrfAdapterAbi,
  disputeManagerAbi,
  fundVaultAbi,
} from './generated.js'
import { addresses } from './addresses.js'

// 重新匯出所有產生的 ABI 常數（含 iFundVaultAbi 介面）。
export * from './generated.js'
export { addresses }

/// 可由 getContractConfig 取得（鏈上有位址）的合約名稱。
export type ContractName = 'FundVault' | 'AssessorRegistry' | 'DisputeManager' | 'ChainlinkVRFAdapter'

const abis = {
  FundVault: fundVaultAbi,
  AssessorRegistry: assessorRegistryAbi,
  DisputeManager: disputeManagerAbi,
  ChainlinkVRFAdapter: chainlinkVrfAdapterAbi,
} as const

/**
 * 以鏈 ID 與合約名稱取得 { address, abi }，供 wagmi（前端）或 viem（後端）使用。
 * 位址來源為 deployments/<chainId>.json（經 gen:addresses 產生 addresses.ts）。
 * @throws 若該鏈上查無此合約位址。
 */
export function getContractConfig<TName extends ContractName>(chainId: number, name: TName) {
  const address = addresses[chainId]?.[name]
  if (!address) {
    throw new Error(`查無合約位址：chainId=${chainId}, contract=${name}（請先部署並執行 gen:addresses）`)
  }
  return { address, abi: abis[name] }
}

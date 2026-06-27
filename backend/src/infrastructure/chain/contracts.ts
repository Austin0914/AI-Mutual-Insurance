import type { Abi, AbiEvent } from 'viem'
import { getContractConfig, type ContractName } from '@ai-insurance/abi'

// 正式合約配置入口（取代先前的 abi-stub）：
// 後端一律經 @ai-insurance/abi 取得 address + abi，鏈上為唯一權威來源。

export interface MonitoredContract {
  name: ContractName
  address: `0x${string}`
  abi: Abi
  events: AbiEvent[]
}

// 索引器監聽的合約集合。投影目前聚焦 FundVault 與 AssessorRegistry，
// DisputeManager 一併納入配置以利後續擴充。
export const MONITORED_CONTRACTS: readonly ContractName[] = [
  'FundVault',
  'AssessorRegistry',
  'DisputeManager',
] as const

/**
 * 載入指定鏈上要監聽的合約配置（address / abi / events）。
 * 若某合約在該鏈尚無位址，會被略過並收錄於 missing。
 */
export function loadMonitoredContracts(
  chainId: number,
  names: readonly ContractName[] = MONITORED_CONTRACTS,
): { contracts: MonitoredContract[]; missing: ContractName[] } {
  const contracts: MonitoredContract[] = []
  const missing: ContractName[] = []

  for (const name of names) {
    try {
      const { address, abi } = getContractConfig(chainId, name)
      const events = (abi as Abi).filter((item): item is AbiEvent => item.type === 'event')
      contracts.push({ name, address: address as `0x${string}`, abi: abi as Abi, events })
    } catch {
      missing.push(name)
    }
  }

  return { contracts, missing }
}

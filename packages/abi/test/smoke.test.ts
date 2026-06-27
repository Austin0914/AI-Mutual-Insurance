import { describe, expect, it } from 'vitest'

import { fundVaultAbi, disputeManagerAbi, getContractConfig } from '../src/index'

describe('@ai-insurance/abi 管線煙霧測試', () => {
  it('匯出非空的 ABI 常數', () => {
    expect(Array.isArray(fundVaultAbi)).toBe(true)
    expect(fundVaultAbi.length).toBeGreaterThan(0)
    expect(Array.isArray(disputeManagerAbi)).toBe(true)
    expect(disputeManagerAbi.length).toBeGreaterThan(0)
  })

  it('fundVaultAbi 含 settle 函式', () => {
    const hasSettle = fundVaultAbi.some((item) => item.type === 'function' && item.name === 'settle')
    expect(hasSettle).toBe(true)
  })

  it('getContractConfig 對未部署的鏈拋錯', () => {
    expect(() => getContractConfig(999_999, 'FundVault')).toThrow()
  })
})

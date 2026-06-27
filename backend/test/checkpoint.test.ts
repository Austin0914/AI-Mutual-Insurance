import { describe, expect, it } from 'vitest'
import { nextFromBlock } from '../src/application/indexer.js'

describe('nextFromBlock', () => {
  it('無 checkpoint 時從 startBlock 開始', () => {
    expect(nextFromBlock(null, 0n)).toBe(0n)
    expect(nextFromBlock(null, 100n)).toBe(100n)
  })

  it('有 checkpoint 時從 checkpoint+1 續掃', () => {
    expect(nextFromBlock(10n, 0n)).toBe(11n)
    expect(nextFromBlock(999n, 500n)).toBe(1000n)
  })
})

import {
  emptyFundStatus,
  type DecodedEvent,
  type FundStatusState,
  type SlashIncrement,
} from './events.js'

// 純投影函式：給定目前狀態與一筆事件，回傳新狀態。無副作用，便於單元測試。
// 對應事件簽章（contracts/src/interfaces/IFundVault.sol）：
//   Contributed(address indexed participant, uint256 amount, uint256 newTotal)
//   Settled(address indexed subscriber, uint256 loss, uint256 deductible, uint256 poolPayout, uint256 residual)
//   ActiveStatusChanged(bool active)
//   LaunchConfigUpdated(uint256 nMin, uint256 dMin, uint256 hhiMaxBps, uint256 etaMaxBps)

function asBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' || typeof value === 'string') return BigInt(value)
  throw new Error(`預期 bigint 相容值，實得：${typeof value}`)
}

export function foldFundStatus(state: FundStatusState, event: DecodedEvent): FundStatusState {
  switch (event.eventName) {
    case 'Contributed': {
      const amount = asBigInt(event.args.amount)
      return {
        ...state,
        totalContributed: state.totalContributed + amount,
        poolBalance: state.poolBalance + amount,
      }
    }
    case 'Settled': {
      // 注意：池支付為 poolPayout，而非 loss。
      const poolPayout = asBigInt(event.args.poolPayout)
      return {
        ...state,
        totalPaidOut: state.totalPaidOut + poolPayout,
        poolBalance: state.poolBalance - poolPayout,
      }
    }
    case 'ActiveStatusChanged': {
      return { ...state, active: Boolean(event.args.active) }
    }
    case 'LaunchConfigUpdated': {
      return {
        ...state,
        nMin: asBigInt(event.args.nMin),
        dMin: asBigInt(event.args.dMin),
        hhiMaxBps: asBigInt(event.args.hhiMaxBps),
        etaMaxBps: asBigInt(event.args.etaMaxBps),
      }
    }
    default:
      return state
  }
}

// 將一批事件依序摺疊到初始狀態，回傳最終 FundStatus。
export function reduceFundStatus(
  initial: FundStatusState,
  events: readonly DecodedEvent[],
): FundStatusState {
  return events.reduce(foldFundStatus, initial)
}

// AssessorSlashed(address indexed assessor, uint256 amount, uint256 newStake)
export function toSlashIncrement(event: DecodedEvent): SlashIncrement | null {
  if (event.eventName !== 'AssessorSlashed') return null
  return {
    assessor: String(event.args.assessor).toLowerCase(),
    amount: asBigInt(event.args.amount),
  }
}

// 彙總一批事件的罰沒增量（依 assessor 累加）。
export function reduceSlashIncrements(events: readonly DecodedEvent[]): Map<string, bigint> {
  const totals = new Map<string, bigint>()
  for (const event of events) {
    const inc = toSlashIncrement(event)
    if (!inc) continue
    totals.set(inc.assessor, (totals.get(inc.assessor) ?? 0n) + inc.amount)
  }
  return totals
}

export { emptyFundStatus }

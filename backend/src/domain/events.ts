// 領域型別：索引器在「鏈上 log」與「DB 投影」之間的純資料表示，
// 不依賴 viem / pg 等框架，便於單元測試。

export interface DecodedEvent {
  contractName: string
  eventName: string
  address: string
  blockNumber: bigint
  blockHash: string
  txHash: string
  logIndex: number
  args: Record<string, unknown>
}

// FundVault 衍生狀態。金額以 bigint 表示（wei 級精度）。
export interface FundStatusState {
  totalContributed: bigint
  totalPaidOut: bigint
  poolBalance: bigint
  active: boolean
  nMin: bigint
  dMin: bigint
  hhiMaxBps: bigint
  etaMaxBps: bigint
}

export const emptyFundStatus: FundStatusState = {
  totalContributed: 0n,
  totalPaidOut: 0n,
  poolBalance: 0n,
  active: false,
  nMin: 0n,
  dMin: 0n,
  hhiMaxBps: 0n,
  etaMaxBps: 0n,
}

// AssessorSlashed 映射出的單筆罰沒增量。
export interface SlashIncrement {
  assessor: string
  amount: bigint
}

// DisputeManager 衍生的單一案件狀態投影。
// 狀態碼對齊合約 CaseStatus：0=None 1=Evidence 2=AwaitingRandomness 3=Assigned 4=Voting 5=Resolved。
export interface DisputeCaseState {
  caseId: bigint
  subscriber: string
  evidenceHash: string
  status: number
  requestId: bigint
  numAssessors: number
  assignedCount: number
  commitDeadline: bigint
  revealDeadline: bigint
  quorumBps: bigint
  committedCount: number
  revealedCount: number
  noShowCount: number
  quorumMet: boolean | null
  medianRatioBps: bigint
  effectiveLoss: bigint
  openedBlock: bigint
  resolvedBlock: bigint | null
  updatedBlock: bigint
}

export function emptyDisputeCase(caseId: bigint): DisputeCaseState {
  return {
    caseId,
    subscriber: '0x0000000000000000000000000000000000000000',
    evidenceHash: '0x',
    status: 0,
    requestId: 0n,
    numAssessors: 0,
    assignedCount: 0,
    commitDeadline: 0n,
    revealDeadline: 0n,
    quorumBps: 0n,
    committedCount: 0,
    revealedCount: 0,
    noShowCount: 0,
    quorumMet: null,
    medianRatioBps: 0n,
    effectiveLoss: 0n,
    openedBlock: 0n,
    resolvedBlock: null,
    updatedBlock: 0n,
  }
}

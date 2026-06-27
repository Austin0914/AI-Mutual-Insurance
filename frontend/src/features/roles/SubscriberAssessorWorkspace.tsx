'use client'

import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { BaseError } from 'viem'
import { useAccount, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'

import { RoleGuard } from './RoleGuard'
import { useRecentDisputes } from '@/hooks/useDisputes'
import { useFundStatus } from '@/hooks/useFundStatus'
import { disputeManagerConfig, fundVaultConfig } from '@/lib/contracts'
import { formatBigInt, shortAddress } from '@/lib/format'
import { Badge, MetricCard, Panel, SectionHeading } from '@/features/ui/Primitives'

const DEMO_EVIDENCE_HASH = `0x${'1'.repeat(64)}` as `0x${string}`
const PARTICIPANT_TYPE_SUBSCRIBER = 2
const FIELD_CLASS =
  'mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 font-mono text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-white/25 focus:bg-black/50'

export function SubscriberAssessorWorkspace() {
  const { status } = useFundStatus()
  const disputes = useRecentDisputes(3)

  return (
    <RoleGuard expectedRole="subscriber_assessor">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeading eyebrow="Subscriber + Assessor" title="使用商與仲裁者工作區">
          使用企業取得設上限的責任分攤，也以專業鑑定者身份參與 commit/reveal。Demo 不驗證鏈下證據真偽。
        </SectionHeading>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard label="共同池餘額" value={formatBigInt(status.poolBalance)} detail="可用池餘額，非完整保險承諾" />
          <MetricCard label="鑑定者數" value={formatBigInt(status.assessorCount)} detail="AssessorRegistry" />
          <MetricCard label="近期案件" value={disputes.nextCaseId?.toString() ?? '—'} detail="DisputeManager.nextCaseId" />
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <OpenDisputeForm />

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">鑑定任務</h2>
              <Badge tone="info">commit/reveal</Badge>
            </div>
            <div className="mt-6 space-y-3">
              {disputes.cases.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.028] p-4 text-sm leading-6 text-zinc-500 backdrop-blur">
                  尚未讀到分派任務。完整任務 inbox 需要索引器協助依鑑定者地址查詢案件。
                </p>
              ) : (
                disputes.cases.map((item) => (
                  <div key={item.caseId.toString()} className="rounded-xl border border-white/10 bg-white/[0.028] p-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-sm text-white">Case #{item.caseId.toString()}</p>
                      <Badge tone={item.status === 4 ? 'warn' : 'neutral'}>status {item.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">loss {formatBigInt(item.loss)} · quorum {item.quorumBps?.toString() ?? '—'} bps</p>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        <Panel className="mt-8 border-amber-400/20 bg-amber-400/10">
          <Badge tone="warn">Salt 保存提醒</Badge>
          <p className="mt-4 text-sm leading-6 text-amber-100">
            commit = hash(ratioBps, salt, caseId)。若前端產生 salt，使用者遺失後將無法 reveal。v1 先展示流程，正式寫入前必須設計清楚的本地保存與匯出策略。
          </p>
          <Link href="/app/dashboard" className="mt-5 inline-flex rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition">
            查看共享監控
          </Link>
        </Panel>
      </div>
    </RoleGuard>
  )
}

function OpenDisputeForm() {
  const { address } = useAccount()
  const [loss, setLoss] = useState('1000')
  const [deductibleBps, setDeductibleBps] = useState('2000')
  const [coverageK, setCoverageK] = useState('10')
  const [evidenceHash, setEvidenceHash] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submittedHash, setSubmittedHash] = useState<`0x${string}` | undefined>()

  const eligibilityContracts = useMemo(
    () =>
      address && fundVaultConfig
        ? [
            { ...fundVaultConfig, functionName: 'participantTypeOf', args: [address] },
            { ...fundVaultConfig, functionName: 'contributionOf', args: [address] },
          ]
        : [],
    [address],
  )

  const eligibility = useReadContracts({
    contracts: eligibilityContracts as never,
    query: { enabled: Boolean(address && fundVaultConfig) },
  })

  const participantType = Number((eligibility.data?.[0] as { result?: number } | undefined)?.result ?? 0)
  const contribution = (eligibility.data?.[1] as { result?: bigint } | undefined)?.result
  const isSubscriber = participantType === PARTICIPANT_TYPE_SUBSCRIBER
  const hasContribution = contribution !== undefined && contribution > 0n

  const { writeContractAsync, isPending } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({
    hash: submittedHash,
    query: { enabled: Boolean(submittedHash) },
  })

  const eligibilityMessage = useMemo(() => {
    if (!address) return '請先連結錢包，才能用目前地址開啟爭議。'
    if (!disputeManagerConfig || !fundVaultConfig) return '目前鏈上尚未部署 DisputeManager 或 FundVault。'
    if (eligibility.isLoading) return '正在確認此錢包的鏈上 Subscriber 注資狀態。'
    if (eligibility.isError) return '無法讀取此錢包的鏈上參與狀態，請確認 RPC 與鏈 ID。'
    if (!isSubscriber) return '目前錢包不是鏈上 Subscriber；請先以 Subscriber 身份注資。'
    if (!hasContribution) return '目前錢包尚未有 Subscriber 注資紀錄，不能自助開案。'
    return null
  }, [address, eligibility.isError, eligibility.isLoading, hasContribution, isSubscriber])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (eligibilityMessage) {
      setFormError(eligibilityMessage)
      return
    }
    if (!disputeManagerConfig) {
      setFormError('找不到 DisputeManager 合約設定。')
      return
    }

    const parsed = parseOpenDisputeForm({ loss, deductibleBps, coverageK, evidenceHash })
    if (!parsed.ok) {
      setFormError(parsed.message)
      return
    }

    try {
      setSubmittedHash(undefined)
      const hash = await writeContractAsync({
        ...disputeManagerConfig,
        functionName: 'openDisputeForSelf',
        args: [parsed.loss, parsed.deductibleBps, parsed.coverageK, parsed.evidenceHash],
      })
      setSubmittedHash(hash)
    } catch (error) {
      setFormError(formatTransactionError(error))
    }
  }

  const disabled = Boolean(eligibilityMessage || isPending || receipt.isLoading)

  return (
    <Panel glow>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">提出索賠 / 開啟爭議</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            由目前錢包直接呼叫 openDisputeForSelf，鏈上保存 evidence hash，完整證據維持鏈下。
          </p>
        </div>
        <Badge tone={eligibilityMessage ? 'warn' : 'good'}>{eligibilityMessage ? '需完成注資' : '可開案'}</Badge>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.028] p-4 text-sm text-zinc-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>錢包 {shortAddress(address)}</span>
          <span>participantType {participantType}</span>
          <span>contribution {formatBigInt(contribution)}</span>
        </div>
        {eligibilityMessage ? <p className="mt-3 text-amber-200">{eligibilityMessage}</p> : null}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-zinc-400">
            loss
            <input value={loss} onChange={(event) => setLoss(event.target.value)} inputMode="numeric" className={FIELD_CLASS} />
          </label>
          <label className="text-sm text-zinc-400">
            deductibleBps
            <input value={deductibleBps} onChange={(event) => setDeductibleBps(event.target.value)} inputMode="numeric" className={FIELD_CLASS} />
          </label>
          <label className="text-sm text-zinc-400">
            coverageK
            <input value={coverageK} onChange={(event) => setCoverageK(event.target.value)} inputMode="numeric" className={FIELD_CLASS} />
          </label>
        </div>

        <label className="block text-sm text-zinc-400">
          evidenceHash
          <textarea
            value={evidenceHash}
            onChange={(event) => setEvidenceHash(event.target.value)}
            rows={3}
            className={`${FIELD_CLASS} resize-none break-all`}
            placeholder="0x + 64 hex chars"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={disabled} className="rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition">
            {isPending ? '等待錢包確認' : receipt.isLoading ? '等待鏈上確認' : '開啟爭議案件'}
          </button>
          <button
            type="button"
            onClick={() => setEvidenceHash(DEMO_EVIDENCE_HASH)}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.06]"
          >
            填入 demo hash
          </button>
        </div>
      </form>

      {formError ? <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-100">{formError}</p> : null}
      {submittedHash ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.028] p-4 text-sm leading-6 text-zinc-400">
          <p className="font-mono text-zinc-300">tx {shortAddress(submittedHash, 6)}</p>
          {receipt.isSuccess ? (
            <p className="mt-2 text-emerald-200">交易已確認，案件已進入 Evidence 狀態。共享監控會讀取最新 caseId。</p>
          ) : (
            <p className="mt-2 text-zinc-500">交易已送出，等待區塊確認。</p>
          )}
          {receipt.isError ? <p className="mt-2 text-red-200">{formatTransactionError(receipt.error)}</p> : null}
          <Link href="/app/dashboard" className="mt-3 inline-flex rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/[0.06]">
            前往共享監控
          </Link>
        </div>
      ) : null}
    </Panel>
  )
}

type ParsedOpenDisputeForm =
  | { ok: true; loss: bigint; deductibleBps: bigint; coverageK: bigint; evidenceHash: `0x${string}` }
  | { ok: false; message: string }

function parseOpenDisputeForm(values: {
  loss: string
  deductibleBps: string
  coverageK: string
  evidenceHash: string
}): ParsedOpenDisputeForm {
  const loss = parseUnsignedInteger(values.loss)
  if (loss === null || loss === 0n) return { ok: false, message: 'loss 必須是大於 0 的整數。' }

  const deductibleBps = parseUnsignedInteger(values.deductibleBps)
  if (deductibleBps === null || deductibleBps > 10_000n) {
    return { ok: false, message: 'deductibleBps 必須是 0 到 10000 之間的整數。' }
  }

  const coverageK = parseUnsignedInteger(values.coverageK)
  if (coverageK === null || coverageK === 0n) return { ok: false, message: 'coverageK 必須是大於 0 的整數。' }

  const evidenceHash = values.evidenceHash.trim()
  if (!/^0x[0-9a-fA-F]{64}$/.test(evidenceHash)) {
    return { ok: false, message: 'evidenceHash 必須是 bytes32：0x 後接 64 個十六進位字元。' }
  }
  if (/^0x0{64}$/i.test(evidenceHash)) return { ok: false, message: 'evidenceHash 不可為 0x00...00。' }

  return { ok: true, loss, deductibleBps, coverageK, evidenceHash: evidenceHash as `0x${string}` }
}

function parseUnsignedInteger(value: string) {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  return BigInt(trimmed)
}

function formatTransactionError(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage
  if (error instanceof Error) return error.message
  return '交易送出失敗，請稍後重試。'
}

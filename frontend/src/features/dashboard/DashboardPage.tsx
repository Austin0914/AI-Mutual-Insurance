'use client'

import Link from 'next/link'

import { useRecentDisputes, CASE_STATUS_LABELS } from '@/hooks/useDisputes'
import { useFundStatus } from '@/hooks/useFundStatus'
import { useDisputeHistory, useIndexerHealth, useSlashedBreakdown } from '@/hooks/useIndexer'
import { CONTRACT_LABELS, deployedAddresses } from '@/lib/contracts'
import { formatBigInt, formatBps, formatTimestamp, shortAddress } from '@/lib/format'
import { CHAIN_ID, CHAIN_LABEL } from '@/lib/wagmi'
import { Badge, MetricCard, Panel, SectionHeading } from '@/features/ui/Primitives'

function LaunchCheck({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-sm backdrop-blur">
      <span className="text-zinc-400">{label}</span>
      <Badge tone={value ? 'good' : 'warn'}>{value ? '達標' : '待達標'}</Badge>
    </div>
  )
}

export function DashboardPage() {
  const { status, notDeployed, isLoading, isError, refetch } = useFundStatus()
  const disputes = useRecentDisputes(5)
  const indexer = useIndexerHealth()
  const disputeHistory = useDisputeHistory(50)
  const slashedBreakdown = useSlashedBreakdown()
  const launch = status.launchStatus

  const statusTone = isError ? 'danger' : status.active ? 'good' : 'warn'
  const statusLabel = isLoading ? '載入中' : isError ? 'RPC 不可用' : status.active ? '已啟動' : '籌備中'

  // 案件狀態分布：索引器在線時用「完整」歷史，否則回退近 5 筆鏈上讀取。
  const distributionCounts = disputeHistory.online ? disputeHistory.counts : disputes.counts
  const distributionSource = disputeHistory.online
    ? `索引器全量 ${disputeHistory.total} 件`
    : '鏈上近 5 筆（索引器離線）'

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end">
        <SectionHeading eyebrow="Shared Monitor" title="共享監控儀表板">
          所有角色看到同一份鏈上狀態。資金與規則以合約為準；歷史與累積統計由後端索引器提供，索引器離線時會明確標示並回退鏈上即時讀取。
        </SectionHeading>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={indexer.online ? 'good' : 'warn'}>
            {indexer.online
              ? `索引器在線 · safeBlock ${indexer.health?.lastSafeBlock ?? '—'} · lag ${indexer.health?.lag ?? '—'}`
              : '索引器離線'}
          </Badge>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            重新整理鏈上狀態
          </button>
          <Link
            href="/choose-role"
            className="rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition"
          >
            選擇 / 重設身份
          </Link>
        </div>
      </div>

      {notDeployed ? (
        <Panel className="mt-8 border-amber-400/20 bg-amber-400/10">
          <Badge tone="warn">尚未部署</Badge>
          <p className="mt-4 text-sm leading-6 text-amber-100">
            尚未在鏈 {CHAIN_ID} 偵測到必要合約位址。請先部署本地合約並重新產生 ABI/address package。
          </p>
          <code className="mt-4 block rounded-lg border border-amber-300/20 bg-black/40 p-3 font-mono text-xs text-amber-100">
            pnpm deploy:local && pnpm gen:addresses && pnpm build:abi
          </code>
        </Panel>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="基金狀態 active()" value={statusLabel} tone={statusTone} detail={`${CHAIN_LABEL} · chainId ${CHAIN_ID}`} />
        <MetricCard label="共同池餘額 poolBalance" value={formatBigInt(status.poolBalance)} detail="raw token units" />
        <MetricCard label="累計注資 totalContributed" value={formatBigInt(status.totalContributed)} detail="Provider + Subscriber" />
        <MetricCard label="累計賠付 totalPaidOut" value={formatBigInt(status.totalPaidOut)} detail="已由 FundVault 支付" />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="參與者 participantCount" value={formatBigInt(status.participantCount)} detail="啟動門檻聚合量" />
        <MetricCard label="鑑定者 assessorCount" value={formatBigInt(status.assessorCount)} detail="AssessorRegistry" />
        <MetricCard label="累計罰沒 totalSlashed" value={formatBigInt(status.totalSlashed)} detail="no-show / slash 記錄" />
        <MetricCard label="注資代幣 token" value={<span className="font-mono text-sm">{shortAddress(status.token)}</span>} detail="ERC20 address" />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">啟動門檻</h2>
            <Badge tone={launch?.canActivate ? 'good' : 'warn'}>{launch?.canActivate ? '可啟動' : '籌備中'}</Badge>
          </div>
          <div className="mt-5 space-y-2">
            <LaunchCheck label="參與者數 n_min" value={launch?.meetsParticipants} />
            <LaunchCheck label="總注資 D_min" value={launch?.meetsDeposit} />
            <LaunchCheck label="HHI 集中度" value={launch?.meetsConcentration} />
            <LaunchCheck label="最大單一占比 η" value={launch?.meetsShare} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 backdrop-blur">
              <p className="text-zinc-500">Concentration</p>
              <p className="mt-2 font-mono text-zinc-200">{formatBps(launch?.concentrationBps)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 backdrop-blur">
              <p className="text-zinc-500">Max Share</p>
              <p className="mt-2 font-mono text-zinc-200">{formatBps(launch?.shareBps)}</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">近期爭議案件</h2>
            <Badge tone={disputes.notDeployed ? 'warn' : 'info'}>
              {disputes.notDeployed ? 'DisputeManager 未部署' : `nextCaseId ${disputes.nextCaseId?.toString() ?? '—'}`}
            </Badge>
          </div>
          {disputes.cases.length === 0 ? (
            <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-zinc-500 backdrop-blur">
              尚未讀到案件。案件列表的完整搜尋與歷史統計需後端索引器；目前 dashboard 只嘗試讀取最近 5 筆鏈上 caseId。
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  <tr>
                    <th className="border-b border-white/10 pb-3">Case</th>
                    <th className="border-b border-white/10 pb-3">Status</th>
                    <th className="border-b border-white/10 pb-3">Subscriber</th>
                    <th className="border-b border-white/10 pb-3">Loss</th>
                    <th className="border-b border-white/10 pb-3">Reveal</th>
                    <th className="border-b border-white/10 pb-3">Quorum</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.cases.map((item) => (
                    <tr key={item.caseId.toString()} className="text-zinc-300">
                      <td className="border-b border-white/10 py-3 font-mono">#{item.caseId.toString()}</td>
                      <td className="border-b border-white/10 py-3">{CASE_STATUS_LABELS[item.status] ?? 'Unknown'}</td>
                      <td className="border-b border-white/10 py-3 font-mono text-xs">{shortAddress(item.subscriber)}</td>
                      <td className="border-b border-white/10 py-3 font-mono">{formatBigInt(item.loss)}</td>
                      <td className="border-b border-white/10 py-3">{formatTimestamp(item.revealDeadline)}</td>
                      <td className="border-b border-white/10 py-3">{formatBps(item.quorumBps)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">案件狀態分布</h2>
            <Badge tone={disputeHistory.online ? 'info' : 'warn'}>{distributionSource}</Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {disputeHistory.online
              ? '由索引器投影全量案件聚合，涵蓋歷史案件。'
              : '索引器離線，暫以最近鏈上讀取的案件估算。'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CASE_STATUS_LABELS.slice(1).map((label) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.045] p-3 backdrop-blur">
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="mt-2 font-mono text-2xl text-white">{distributionCounts[label] ?? 0}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">鑑定者罰沒彙總</h2>
            <Badge tone={slashedBreakdown.online ? 'info' : 'warn'}>
              {slashedBreakdown.online ? `索引器 · ${slashedBreakdown.assessors.length} 位` : '索引器離線'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            各鑑定者累計被罰沒額（AssessorSlashed 事件彙總，鏈上無此分項聚合）。
          </p>
          {slashedBreakdown.assessors.length === 0 ? (
            <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-zinc-500 backdrop-blur">
              {slashedBreakdown.online ? '尚無罰沒紀錄。' : '索引器離線，無法讀取罰沒彙總。'}
            </p>
          ) : (
            <div className="mt-5 space-y-2">
              {slashedBreakdown.assessors.map((row) => (
                <div
                  key={row.assessor}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3 backdrop-blur"
                >
                  <span className="font-mono text-xs text-zinc-300">{shortAddress(row.assessor as `0x${string}`)}</span>
                  <span className="font-mono text-sm text-white">{formatBigInt(BigInt(row.totalSlashed))}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">合約位址</h2>
            <Badge tone="info">@ai-insurance/abi</Badge>
          </div>
          <div className="mt-5 space-y-2">
            {Object.entries(CONTRACT_LABELS).map(([name, label]) => (
              <div key={name} className="rounded-lg border border-white/10 bg-white/[0.045] p-3 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <Badge tone={deployedAddresses[name] ? 'good' : 'warn'}>{deployedAddresses[name] ? '已部署' : '未部署'}</Badge>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-zinc-500">{deployedAddresses[name] ?? '—'}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

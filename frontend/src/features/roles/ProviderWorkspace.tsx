'use client'

import Link from 'next/link'

import { RoleGuard } from './RoleGuard'
import { useFundStatus } from '@/hooks/useFundStatus'
import { formatBigInt } from '@/lib/format'
import { Badge, MetricCard, Panel, SectionHeading } from '@/features/ui/Primitives'

export function ProviderWorkspace() {
  const { status } = useFundStatus()

  return (
    <RoleGuard expectedRole="provider">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeading eyebrow="Provider Workspace" title="模型/API 提供商工作區">
          展示 Provider 如何用注資與透明規則，對模型品質提供可驗證責任承諾。v1 先呈現狀態與流程，寫入交易留到後續階段。
        </SectionHeading>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard label="基金狀態" value={status.active ? '已啟動' : '籌備中'} tone={status.active ? 'good' : 'warn'} />
          <MetricCard label="共同池餘額" value={formatBigInt(status.poolBalance)} detail="FundVault.poolBalance" />
          <MetricCard label="累計注資" value={formatBigInt(status.totalContributed)} detail="totalContributed" />
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <Panel glow>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Provider 責任姿態</h2>
              <Badge tone="info">Demo flow</Badge>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['API 用量', '未接真實用量', '後續可接 billing / usage oracle'],
                ['注資責任', '待接寫入', 'contribute(Provider, amount)'],
                ['被追責案件', '索引器規劃中', 'DisputeManager 事件投影'],
              ].map(([title, value, detail]) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
                  <p className="text-sm text-zinc-500">{title}</p>
                  <p className="mt-3 text-lg font-semibold text-white">{value}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-white">品質保證 Log</h2>
            <div className="mt-5 space-y-3 font-mono text-sm text-zinc-300">
              <p><span className="text-zinc-600">›</span> provider.identity: wallet scoped</p>
              <p><span className="text-zinc-600">›</span> vault.read: FundVault status synced</p>
              <p><span className="text-zinc-600">›</span> contribution.write: pending milestone</p>
              <p><span className="text-zinc-600">›</span> dispute.projection: indexer planned</p>
            </div>
          </Panel>
        </section>

        <Panel className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold text-white">下一步</h2>
              <p className="mt-2 text-sm text-zinc-500">先從共享監控確認基金狀態；寫入注資與案件回應會在 UI 穩定後接上。</p>
            </div>
            <Link href="/app/dashboard" className="rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition">
              查看共享監控
            </Link>
          </div>
        </Panel>
      </div>
    </RoleGuard>
  )
}

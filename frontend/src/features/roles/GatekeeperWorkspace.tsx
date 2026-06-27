'use client'

import Link from 'next/link'

import { RoleGuard } from './RoleGuard'
import { Badge, MetricCard, Panel, SectionHeading } from '@/features/ui/Primitives'

const applications = [
  { company: 'Northstar Robotics', role: 'Subscriber', status: '需補件', risk: '模型使用場景未分類' },
  { company: 'Vector API Labs', role: 'Provider', status: '審查中', risk: '受益所有人待確認' },
  { company: 'AuditWorks Taiwan', role: 'Assessor', status: '可通過', risk: '低風險' },
]

export function GatekeeperWorkspace() {
  return (
    <RoleGuard expectedRole="gatekeeper">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeading eyebrow="Gatekeeper Workspace" title="資格審查商工作區">
          Demo 化的企業准入看板。Gatekeeper 能管理誰能進入池子，但不能單方面決定誰應理賠。
        </SectionHeading>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <MetricCard label="待審申請" value="3" detail="Demo mock" tone="warn" />
          <MetricCard label="已通過" value="12" detail="Demo mock" tone="good" />
          <MetricCard label="需補件" value="1" detail="Demo mock" />
        </div>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Panel glow>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">申請 Queue</h2>
              <Badge tone="warn">Demo data</Badge>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  <tr>
                    <th className="border-b border-white/10 pb-3">Company</th>
                    <th className="border-b border-white/10 pb-3">Role</th>
                    <th className="border-b border-white/10 pb-3">Status</th>
                    <th className="border-b border-white/10 pb-3">Risk tag</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr key={item.company}>
                      <td className="border-b border-white/10 py-4 text-zinc-200">{item.company}</td>
                      <td className="border-b border-white/10 py-4 text-zinc-400">{item.role}</td>
                      <td className="border-b border-white/10 py-4"><Badge tone={item.status === '可通過' ? 'good' : 'warn'}>{item.status}</Badge></td>
                      <td className="border-b border-white/10 py-4 text-zinc-500">{item.risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-white">准入邊界</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
              <p>Gatekeeper 審查企業身份、業務真實性、API 使用場景與利益衝突。</p>
              <p>它不是真相裁判，不能跳過對抗式鑑定流程，也不能單方面決定理賠。</p>
              <p>此頁不收集真實 KYC/KYB 文件，所有公司資料都是 demo mock。</p>
            </div>
            <Link href="/app/dashboard" className="mt-6 inline-flex rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition">
              查看共享監控
            </Link>
          </Panel>
        </section>
      </div>
    </RoleGuard>
  )
}

'use client'

import type { ReactNode } from 'react'

import { useFundStatus } from '@/hooks/useFundStatus'
import { CONTRACT_LABELS, deployedAddresses } from '@/lib/contracts'
import { CHAIN_ID } from '@/lib/wagmi'

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{children}</div>
    </div>
  )
}

function Banner({ tone, children }: { tone: 'warn' | 'error'; children: ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-800'
  return <div className={`rounded-lg border p-4 text-sm ${styles}`}>{children}</div>
}

export function FundStatusCard() {
  const { status, notDeployed, isLoading, isError } = useFundStatus()

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">AI 共險基金 · 唯讀狀態</h1>
        <p className="mt-1 text-sm text-slate-500">
          鏈 ID {CHAIN_ID}（本地 anvil）· 資料即時讀自鏈上，僅供呈現
        </p>
      </header>

      {notDeployed ? (
        <Banner tone="warn">
          尚未在鏈 {CHAIN_ID} 偵測到合約位址。請先執行：
          <code className="mt-1 block font-mono text-xs">
            pnpm deploy:local &amp;&amp; pnpm gen:addresses &amp;&amp; pnpm build:abi
          </code>
        </Banner>
      ) : isError ? (
        <Banner tone="error">
          無法連線本地節點（http://127.0.0.1:8545）。請確認 anvil 正在執行。
        </Banner>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stat label="基金啟動狀態 active()">
            {isLoading ? (
              <span className="text-slate-400">載入中…</span>
            ) : status.active ? (
              <span className="text-emerald-600">● 已啟動</span>
            ) : (
              <span className="text-slate-500">○ 未啟動</span>
            )}
          </Stat>

          <Stat label="鑑定者數 assessorCount()">
            {isLoading ? '…' : (status.assessorCount?.toString() ?? '—')}
          </Stat>

          <Stat label="累計罰沒 totalSlashed()">
            {isLoading ? '…' : (status.totalSlashed?.toString() ?? '—')}
          </Stat>

          <Stat label="注資代幣 token()">
            <span className="break-all font-mono text-sm">
              {isLoading ? '…' : (status.token ?? '—')}
            </span>
          </Stat>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          已部署合約位址
        </h2>
        <ul className="mt-2 space-y-2">
          {Object.keys(CONTRACT_LABELS).map((name) => {
            const address = deployedAddresses[name]
            return (
              <li
                key={name}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-slate-700">{CONTRACT_LABELS[name]}</span>
                <span className="break-all font-mono text-xs text-slate-500">
                  {address ?? '（未部署）'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

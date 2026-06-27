'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { DEMO_ROLES, type DemoRole, getRoleRoute } from '@/features/demo-identity/types'
import { useDemoIdentity } from '@/features/demo-identity/useDemoIdentity'
import { Badge } from '@/features/ui/Primitives'
import { WalletAccountMenu } from '@/features/wallet/WalletAccountMenu'
import { shortAddress } from '@/lib/format'

const roleDetails: Array<{
  role: DemoRole
  jobs: string[]
  note: string
}> = [
  {
    role: 'provider',
    jobs: ['查看注資責任', '追蹤共同池狀態', '檢視被追責案件'],
    note: '適合展示模型/API 提供商如何把品質承諾放進可驗證資金池。',
  },
  {
    role: 'subscriber_assessor',
    jobs: ['查看自身保障', '提出索賠流程', '處理 commit/reveal 任務'],
    note: 'Demo 將使用企業與仲裁者合併，方便展示案件流。',
  },
  {
    role: 'gatekeeper',
    jobs: ['查看准入申請', '標記風險分群', '展示利益衝突提示'],
    note: '只展示 KYC/KYB 概念，不收集真實企業個資。',
  },
]

export function RoleSelectionPage() {
  const router = useRouter()
  const { address, chainId, identity, setRole } = useDemoIdentity()
  const [pendingRole, setPendingRole] = useState<DemoRole | null>(null)
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current)
    }
  }, [])

  function chooseRole(role: DemoRole) {
    if (pendingRole) return

    const next = setRole(role)
    if (!next) return

    setPendingRole(role)
    routeTimerRef.current = setTimeout(() => {
      router.push(getRoleRoute(next.role))
    }, 2500)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-6 py-6 text-zinc-100 ai-grid-bg">
      <div aria-hidden className="ai-app-mesh" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-white">
              AI 共險基金
            </Link>
            <Link
              href="/whitepaper"
              className="hidden rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white md:inline-flex"
            >
              白皮書
            </Link>
          </div>
          <WalletAccountMenu />
        </header>

        <section className="py-16">
          <Badge tone={address ? 'good' : 'warn'}>{address ? `已連線 ${shortAddress(address)}` : '請先連結錢包'}</Badge>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold text-white sm:text-6xl">選擇這個錢包的 Demo 身份</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
            身份只保存在本機瀏覽器，並以 chainId + wallet address 分開管理。切換錢包後會重新讀取該地址自己的角色狀態。
          </p>
          {identity ? (
            <p className="mt-4 text-sm text-zinc-500">
              目前身份：<span className="text-zinc-200">{DEMO_ROLES[identity.role].label}</span>。重新選擇會覆蓋這個錢包的 Demo 身份。
            </p>
          ) : null}
        </section>

        {!address ? (
          <div className="rounded-2xl border border-white/10 ai-glass-surface p-6">
            <h2 className="text-xl font-semibold text-white">需要錢包作為 Demo 帳號</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              請使用右上角連結錢包。Demo 不會要求真實 KYC，也不會把角色寫入鏈上。
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {roleDetails.map((item) => {
              const meta = DEMO_ROLES[item.role]
              const selected = identity?.role === item.role
              return (
                <button
                  type="button"
                  key={item.role}
                  onClick={() => chooseRole(item.role)}
                  disabled={pendingRole !== null}
                  className="ai-card-glow rounded-2xl border border-white/10 ai-glass-surface p-6 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-wait disabled:opacity-70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={selected ? 'good' : 'neutral'}>{selected ? '目前身份' : 'Demo role'}</Badge>
                    <span className="font-mono text-xs text-zinc-600">{chainId}</span>
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold text-white">{meta.label}</h2>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{meta.description}</p>
                  <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                    {item.jobs.map((job) => (
                      <li key={job} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-zinc-500" />
                        <span>{job}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-xs leading-5 text-zinc-500">{item.note}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {pendingRole ? <RoleLoadingOverlay role={pendingRole} /> : null}
    </main>
  )
}

function RoleLoadingOverlay({ role }: { role: DemoRole }) {
  const meta = DEMO_ROLES[role]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/54 px-6 backdrop-blur-sm">
      <div className="ai-loading-blob">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">demo identity</div>
        <div className="mt-4 flex items-center justify-center gap-3 font-mono text-sm text-white">
          <span className="ai-loading-symbol" aria-hidden />
          <span>loading {meta.shortLabel}</span>
          <span className="ai-loading-dots" aria-hidden />
        </div>
        <p className="mt-4 max-w-[17rem] text-center text-xs leading-5 text-zinc-400">
          正在把這個錢包帶到對應工作區，Demo 身份已保存在本機。
        </p>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useAccount } from 'wagmi'

import { DEMO_ROLES, getRoleRoute } from '@/features/demo-identity/types'
import { useDemoIdentity } from '@/features/demo-identity/useDemoIdentity'
import { Badge } from '@/features/ui/Primitives'
import { WalletAccountMenu } from '@/features/wallet/WalletAccountMenu'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isConnected } = useAccount()
  const { identity } = useDemoIdentity()
  const isDashboard = pathname === '/app/dashboard'

  const navItems = [
    { href: '/app/dashboard', label: '共享監控' },
    identity ? { href: getRoleRoute(identity.role), label: '我的工作區' } : { href: '/choose-role', label: '選擇身份' },
    { href: '/whitepaper', label: '白皮書' },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-white">
              AI 共險基金
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    pathname === item.href
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <WalletAccountMenu />
        </div>
      </header>

      <div aria-hidden className="ai-app-mesh" />

      <div className="relative z-10">
      {!isConnected && !isDashboard ? (
        <div className="mx-auto max-w-3xl px-6 py-24">
          <Badge tone="warn">需要連結錢包</Badge>
          <h1 className="mt-6 text-4xl font-semibold text-white">請先登入錢包帳號</h1>
          <p className="mt-4 text-zinc-400">
            角色工作區需要錢包地址來讀取 Demo 身份。斷開連線不會刪除已選角色，重新連線同一地址後會恢復。
          </p>
          <div className="mt-8">
            <WalletAccountMenu />
          </div>
        </div>
      ) : isConnected && !identity && !isDashboard ? (
        <div className="mx-auto max-w-3xl px-6 py-24">
          <Badge tone="warn">尚未選擇身份</Badge>
          <h1 className="mt-6 text-4xl font-semibold text-white">為這個錢包選一個 Demo 角色</h1>
          <p className="mt-4 text-zinc-400">不同錢包地址會有不同角色紀錄，不會沿用前一個帳號。</p>
          <Link
            href="/choose-role"
            className="mt-8 inline-flex rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition"
          >
            選擇身份
          </Link>
        </div>
      ) : (
        children
      )}
      </div>
    </main>
  )
}

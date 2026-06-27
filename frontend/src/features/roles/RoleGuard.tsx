'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { DEMO_ROLES, type DemoRole, getRoleRoute } from '@/features/demo-identity/types'
import { useDemoIdentity } from '@/features/demo-identity/useDemoIdentity'
import { Badge } from '@/features/ui/Primitives'

export function RoleGuard({ expectedRole, children }: { expectedRole: DemoRole; children: ReactNode }) {
  const { identity } = useDemoIdentity()

  if (!identity) return <>{children}</>

  if (identity.role !== expectedRole) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <Badge tone="warn">角色不符合此工作區</Badge>
        <h1 className="mt-6 text-4xl font-semibold text-white">這個錢包目前是 {DEMO_ROLES[identity.role].label}</h1>
        <p className="mt-4 text-zinc-400">不同錢包地址各自保存 Demo 身份。你可以前往目前角色工作區，或重設此錢包的 Demo 身份。</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={getRoleRoute(identity.role)} className="rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition">
            前往目前工作區
          </Link>
          <Link href="/choose-role" className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.06]">
            重新選擇身份
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

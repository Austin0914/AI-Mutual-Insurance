'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'

import { useDemoIdentity } from '@/features/demo-identity/useDemoIdentity'
import { DEMO_ROLES, getRoleRoute } from '@/features/demo-identity/types'
import { shortAddress } from '@/lib/format'

import { useWalletConnection } from './useWalletConnection'

export function WalletAccountMenu({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)
  const { isConnected } = useAccount()
  const { address, chainId, identity, role, resetIdentity } = useDemoIdentity()
  const { connectWallet, switchWallet, disconnectWallet, isPending, error, hasConnector } = useWalletConnection()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  async function handleConnect() {
    const result = await connectWallet()
    const connectedAddress = result?.accounts?.[0]
    if (connectedAddress) {
      const key = `ai-insurance.demo.identity.${result.chainId}.${connectedAddress.toLowerCase()}`
      const existing = window.localStorage.getItem(key)
      if (!existing && pathname !== '/choose-role') router.push('/choose-role')
    }
  }

  async function handleSwitch() {
    setOpen(false)
    await switchWallet()
  }

  function handleDisconnect() {
    setOpen(false)
    disconnectWallet()
  }

  function handleReset() {
    setOpen(false)
    resetIdentity()
    router.push('/choose-role')
  }

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={handleConnect}
          disabled={!hasConnector || isPending}
          className="rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed"
        >
          {isPending ? '連線中...' : '連結錢包'}
        </button>
        {error ? <p className="max-w-xs text-xs text-red-300">{error}</p> : null}
      </div>
    )
  }

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <span className="font-mono text-xs text-zinc-300">{shortAddress(address)}</span>
        {!compact ? (
          <span className="hidden text-xs text-zinc-500 sm:inline">
            {role ? DEMO_ROLES[role].shortLabel : '未選身份'} · {chainId}
          </span>
        ) : null}
        <span className="text-zinc-500">⌄</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-white/10 ai-glass-surface p-2 shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 px-3 py-3">
            <p className="text-xs text-zinc-500">目前錢包</p>
            <p className="mt-1 break-all font-mono text-xs text-zinc-200">{address}</p>
            <p className="mt-2 text-xs text-zinc-500">Chain ID {chainId}</p>
            <p className="mt-1 text-xs text-zinc-300">
              {role ? DEMO_ROLES[role].label : '尚未選擇 Demo 身份'}
            </p>
          </div>

          <div className="py-2">
            {identity ? (
              <Link
                href={getRoleRoute(identity.role)}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
              >
                前往我的工作區
              </Link>
            ) : (
              <Link
                href="/choose-role"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.06]"
              >
                選擇 Demo 身份
              </Link>
            )}
            <button
              type="button"
              onClick={handleSwitch}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
              切換錢包 / 連結其他錢包
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
            >
              斷開連線
            </button>
            {identity ? (
              <button
                type="button"
                onClick={handleReset}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
              >
                重設此錢包的 Demo 身份
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'

import {
  getDemoIdentityKey,
  isDemoRole,
  type DemoIdentity,
  type DemoRole,
} from './types'

function readIdentity(chainId?: number, address?: `0x${string}`): DemoIdentity | null {
  if (!chainId || !address || typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(getDemoIdentityKey(chainId, address))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<DemoIdentity>
    if (parsed.address?.toLowerCase() !== address.toLowerCase()) return null
    if (parsed.chainId !== chainId) return null
    if (!isDemoRole(parsed.role)) return null
    return parsed as DemoIdentity
  } catch {
    return null
  }
}

export function useDemoIdentity() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [identity, setIdentityState] = useState<DemoIdentity | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const storageKey = useMemo(() => {
    if (!address || !chainId) return null
    return getDemoIdentityKey(chainId, address)
  }, [address, chainId])

  const refresh = useCallback(() => {
    setIdentityState(readIdentity(chainId, address))
    setHydrated(true)
  }, [address, chainId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (!storageKey || event.key === storageKey) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh, storageKey])

  const setRole = useCallback(
    (role: DemoRole) => {
      if (!address || !chainId) return null
      const next: DemoIdentity = {
        address,
        chainId,
        role,
        selectedAt: new Date().toISOString(),
      }
      window.localStorage.setItem(getDemoIdentityKey(chainId, address), JSON.stringify(next))
      setIdentityState(next)
      return next
    },
    [address, chainId],
  )

  const resetIdentity = useCallback(() => {
    if (!address || !chainId) return
    window.localStorage.removeItem(getDemoIdentityKey(chainId, address))
    setIdentityState(null)
  }, [address, chainId])

  return {
    address,
    chainId,
    hydrated,
    identity,
    role: identity?.role,
    setRole,
    resetIdentity,
    refresh,
  }
}

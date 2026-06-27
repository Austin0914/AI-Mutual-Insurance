'use client'

import { useCallback, useMemo, useState } from 'react'
import { useConnect, useDisconnect } from 'wagmi'

interface EthereumProvider {
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function getEthereumProvider(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as Window & { ethereum?: EthereumProvider }).ethereum
}

export function useWalletConnection() {
  const { connectors, connectAsync, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [error, setError] = useState<string | null>(null)

  const injectedConnector = useMemo(() => connectors.find((connector) => connector.type === 'injected') ?? connectors[0], [connectors])

  const connectWallet = useCallback(async () => {
    if (!injectedConnector) {
      setError('找不到瀏覽器錢包 connector')
      return null
    }
    setError(null)
    try {
      return await connectAsync({ connector: injectedConnector })
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : '錢包連線失敗')
      return null
    }
  }, [connectAsync, injectedConnector])

  const switchWallet = useCallback(async () => {
    setError(null)
    try {
      await getEthereumProvider()?.request?.({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      })
    } catch {
      // Some injected wallets do not support explicit account switching; connecting still refreshes account state.
    }
    return connectWallet()
  }, [connectWallet])

  const disconnectWallet = useCallback(() => {
    setError(null)
    disconnect()
  }, [disconnect])

  return {
    connectWallet,
    switchWallet,
    disconnectWallet,
    isPending,
    error,
    hasConnector: Boolean(injectedConnector),
  }
}

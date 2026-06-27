import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? sepolia.rpcUrls.default.http[0]

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  ssr: true,
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
})

/// 本 Demo 的雲端部署目標鏈（Sepolia，chainId 11155111）。
export const CHAIN_ID = sepolia.id

export const CHAIN_LABEL = 'Sepolia'

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}

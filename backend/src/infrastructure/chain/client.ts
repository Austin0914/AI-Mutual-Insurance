import { createPublicClient, http, type PublicClient } from 'viem'

// viem public client（infrastructure 轉接頭）。索引器唯一的鏈上讀取入口。
export function createChainClient(rpcUrl: string): PublicClient {
  return createPublicClient({ transport: http(rpcUrl) })
}

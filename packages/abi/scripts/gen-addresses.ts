import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 讀 repo 根 deployments/<chainId>.json（由部署腳本寫出），
// 產生 src/addresses.ts，讓 @ai-insurance/abi 自帶位址、無需執行期讀檔。
const here = dirname(fileURLToPath(import.meta.url))
const deploymentsDir = resolve(here, '../../../deployments')
const outFile = resolve(here, '../src/addresses.ts')

type AddressMap = Record<string, `0x${string}`>
const byChain: Record<number, AddressMap> = {}

let files: string[] = []
try {
  files = readdirSync(deploymentsDir).filter((f) => f.endsWith('.json'))
} catch {
  // deployments/ 不存在時產生空表（尚未部署）。
}

for (const file of files) {
  const chainId = Number(file.replace('.json', ''))
  if (!Number.isInteger(chainId)) continue
  const json = JSON.parse(readFileSync(join(deploymentsDir, file), 'utf-8')) as AddressMap
  byChain[chainId] = json
}

const header = '// 由 scripts/gen-addresses.ts 從 deployments/*.json 產生，請勿手改。\n'
const body =
  'export const addresses: Record<number, Partial<Record<string, `0x${string}`>>> = ' +
  JSON.stringify(byChain, null, 2) +
  '\n'

writeFileSync(outFile, header + body)
console.log(`addresses.ts 已更新，鏈：${Object.keys(byChain).join(', ') || '（無）'}`)

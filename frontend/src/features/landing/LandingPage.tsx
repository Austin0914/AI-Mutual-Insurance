'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'

import { DEMO_ROLES, getDemoIdentityKey, getRoleRoute, isDemoRole } from '@/features/demo-identity/types'
import { useDemoIdentity } from '@/features/demo-identity/useDemoIdentity'
import { SectionHeading } from '@/features/ui/Primitives'
import { WalletAccountMenu } from '@/features/wallet/WalletAccountMenu'
import { useWalletConnection } from '@/features/wallet/useWalletConnection'
import { shortAddress } from '@/lib/format'

function roleFromStorage(chainId: number, address: string) {
  const raw = window.localStorage.getItem(getDemoIdentityKey(chainId, address))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { role?: unknown }
    return isDemoRole(parsed.role) ? parsed.role : null
  } catch {
    return null
  }
}

export function LandingPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { address, chainId, identity } = useDemoIdentity()
  const { connectWallet, isPending } = useWalletConnection()

  async function enterDemo() {
    if (address && identity) {
      router.push(getRoleRoute(identity.role))
      return
    }

    if (address && !identity) {
      router.push('/choose-role')
      return
    }

    const result = await connectWallet()
    const connectedAddress = result?.accounts?.[0]
    if (!connectedAddress) return

    const role = roleFromStorage(result.chainId, connectedAddress)
    router.push(role ? getRoleRoute(role) : '/choose-role')
  }

  const terminalLines = [
    '$ connect wallet',
    `wallet: ${address ? shortAddress(address) : 'not connected'}`,
    `identity: ${identity ? DEMO_ROLES[identity.role].shortLabel : 'pending role selection'}`,
    'fund: reads from FundVault',
    'disputes: commit-reveal ready',
  ]

  return (
    <main className="min-h-screen overflow-hidden bg-black text-zinc-100">
      <section className="relative ai-grid-bg">
        <div className="ai-hero-mesh" />
        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight text-white">
              AI 共險基金
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              <Link
                href="/whitepaper"
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                白皮書
              </Link>
              <Link
                href="/app/dashboard"
                className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                共享監控
              </Link>
            </nav>
          </div>
          <WalletAccountMenu compact />
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-84px)] max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
              Demo · 鏈管錢，不管真相
            </div>
            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-7xl">
              AI共險基金
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              一個雙邊質押、自動執行、設上限的 AI 品質保證與責任分攤池。Provider 與使用企業共同注資，鏈上託管資金，鏈下對抗式鑑定判斷爭議。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={enterDemo}
                className="rounded-lg ai-gradient-button px-5 py-3 text-sm font-medium transition"
              >
                {isPending ? '連線中...' : isConnected ? '進入 Demo' : '連結錢包進入 Demo'}
              </button>
              <Link
                href="/app/dashboard"
                className="rounded-lg border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                查看共享監控
              </Link>
              <Link
                href="/whitepaper"
                className="rounded-lg border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                閱讀白皮書
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-500">
              Demo 以錢包作為身分識別，不做真實 KYC/KYB，也不承諾完整保險理賠。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 ai-glass-surface p-4 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-2 border-b border-white/10 px-2 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
              <span className="ml-3 font-mono text-xs text-zinc-500">protocol-demo.log</span>
            </div>
            <div className="space-y-3 px-2 pt-4 font-mono text-sm leading-7">
              {terminalLines.map((line) => (
                <div key={line} className="text-zinc-300">
                  <span className="text-zinc-600">› </span>
                  {line}
                </div>
              ))}
              <div className="pt-3 text-zinc-500">chainId: {chainId}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-black px-6 py-20">
        <div className="mx-auto max-w-7xl space-y-16">
          <SectionHeading eyebrow="Mechanism" title="從加入基金到分層償付">
            Demo 先展示完整操作心智模型：連錢包、選身份、查看共享狀態，再逐步接上鏈上寫入交易。
          </SectionHeading>

          <div className="grid gap-4 md:grid-cols-5">
            {[
              ['01', '加入基金', '錢包作為 Demo 帳號，角色選擇只影響前端體驗。'],
              ['02', '雙邊注資', 'Provider 與使用企業事前注資，資金由 FundVault 託管。'],
              ['03', '爭議舉證', '證據留在鏈下，鏈上保存摘要與案件狀態。'],
              ['04', 'Commit / Reveal', '鑑定者先提交承諾，揭露期才公開責任比例。'],
              ['05', '分層償付', '自負額、共同池上限、殘額回到巨災層或法律途徑。'],
            ].map(([step, title, body]) => (
              <div key={step} className="ai-card-glow rounded-2xl border border-white/10 ai-glass-surface p-5">
                <p className="font-mono text-xs text-zinc-500">{step}</p>
                <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

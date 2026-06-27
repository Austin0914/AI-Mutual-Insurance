import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'AI 共險基金 · Demo',
  description: '雙邊質押、自動執行、設上限的 AI 品質保證與責任分攤池 Demo',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-black text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

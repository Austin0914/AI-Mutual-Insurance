import fs from 'node:fs'
import path from 'node:path'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { Badge } from '@/features/ui/Primitives'
import { WalletAccountMenu } from '@/features/wallet/WalletAccountMenu'

type TocItem = {
  depth: number
  id: string
  text: string
}

type MarkdownBlock =
  | { type: 'heading'; depth: number; id: string; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; code: string; info?: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'footnote'; id: string; text: string }
  | { type: 'hr' }

const WHITEPAPER_RELATIVE_PATH = 'docs/BluePrint/AI共險基金白皮書.md'

function readWhitepaper() {
  const candidates = [
    path.resolve(process.cwd(), '..', WHITEPAPER_RELATIVE_PATH),
    path.resolve(process.cwd(), WHITEPAPER_RELATIVE_PATH),
  ]
  const filePath = candidates.find((candidate) => fs.existsSync(candidate))

  if (!filePath) {
    throw new Error(`Whitepaper not found. Tried: ${candidates.join(', ')}`)
  }

  return {
    markdown: fs.readFileSync(filePath, 'utf8'),
    sourceLabel: WHITEPAPER_RELATIVE_PATH,
  }
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[\^([^\]]+)\]/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim()
}

function slugify(text: string) {
  const slug = stripInlineMarkdown(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')

  return slug || 'section'
}

function uniqueSlug(text: string, counts: Map<string, number>) {
  const base = slugify(text)
  const count = counts.get(base) ?? 0
  counts.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(row: string[]) {
  return row.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
}

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  const toc: TocItem[] = []
  const slugCounts = new Map<string, number>()
  let paragraph: string[] = []
  let index = 0

  function flushParagraph() {
    if (paragraph.length === 0) return
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  while (index < lines.length) {
    const rawLine = lines[index]
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      index += 1
      continue
    }

    if (line.startsWith('```')) {
      flushParagraph()
      const info = line.slice(3).trim()
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'code', code: code.join('\n'), info })
      index += 1
      continue
    }

    const heading = rawLine.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      const depth = heading[1].length
      const text = stripInlineMarkdown(heading[2])
      const id = uniqueSlug(text, slugCounts)
      blocks.push({ type: 'heading', depth, id, text })
      if (depth >= 2 && depth <= 3 && text !== '目錄') {
        toc.push({ depth, id, text })
      }
      index += 1
      continue
    }

    if (/^-{3,}$/.test(line)) {
      flushParagraph()
      blocks.push({ type: 'hr' })
      index += 1
      continue
    }

    const footnote = rawLine.match(/^\[\^([^\]]+)\]:\s*(.+)$/)
    if (footnote) {
      flushParagraph()
      blocks.push({ type: 'footnote', id: footnote[1], text: footnote[2] })
      index += 1
      continue
    }

    if (line.startsWith('|')) {
      flushParagraph()
      const rows: string[][] = []
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      blocks.push({ type: 'table', rows })
      continue
    }

    if (line.startsWith('>')) {
      flushParagraph()
      const quote: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].replace(/^>\s?/, '').trim())
        index += 1
      }
      blocks.push({ type: 'blockquote', text: quote.join(' ') })
      continue
    }

    const unordered = rawLine.match(/^\s*[-*]\s+(.+)$/)
    if (unordered) {
      flushParagraph()
      const items: string[] = []
      while (index < lines.length) {
        const item = lines[index].match(/^\s*[-*]\s+(.+)$/)
        if (!item) break
        items.push(item[1])
        index += 1
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    const ordered = rawLine.match(/^\s*\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      const items: string[] = []
      while (index < lines.length) {
        const item = lines[index].match(/^\s*\d+\.\s+(.+)$/)
        if (!item) break
        items.push(item[1])
        index += 1
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    paragraph.push(line)
    index += 1
  }

  flushParagraph()
  return { blocks, toc }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[\^[^\]]+\])/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    const key = `${match.index}-${token}`
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    const footnote = token.match(/^\[\^([^\]]+)\]$/)

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-zinc-100">
          {token.slice(2, -2)}
        </strong>,
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={key} className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.92em] text-zinc-100">
          {token.slice(1, -1)}
        </code>,
      )
    } else if (link) {
      const href = link[2]
      nodes.push(
        <a
          key={key}
          href={href}
          className="text-sky-300 underline decoration-sky-300/30 underline-offset-4 transition hover:text-white"
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noreferrer' : undefined}
        >
          {link[1]}
        </a>,
      )
    } else if (footnote) {
      nodes.push(
        <sup key={key}>
          <a href={`#fn-${footnote[1]}`} className="ml-0.5 text-sky-300">
            [{footnote[1]}]
          </a>
        </sup>,
      )
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function renderHeading(block: Extract<MarkdownBlock, { type: 'heading' }>) {
  const content = renderInline(block.text)
  const anchor = (
    <a href={`#${block.id}`} className="ml-2 opacity-0 transition group-hover:opacity-60" aria-label={`連結到 ${block.text}`}>
      #
    </a>
  )

  if (block.depth === 1) {
    return (
      <h1 id={block.id} className="group mt-2 text-4xl font-semibold leading-tight text-white sm:text-5xl">
        {content}
        {anchor}
      </h1>
    )
  }

  if (block.depth === 2) {
    return (
      <h2 id={block.id} className="group mt-16 border-t border-white/10 pt-10 text-3xl font-semibold leading-tight text-white">
        {content}
        {anchor}
      </h2>
    )
  }

  if (block.depth === 3) {
    return (
      <h3 id={block.id} className="group mt-10 text-2xl font-semibold leading-tight text-zinc-100">
        {content}
        {anchor}
      </h3>
    )
  }

  return (
    <h4 id={block.id} className="group mt-8 text-lg font-semibold leading-tight text-zinc-100">
      {content}
      {anchor}
    </h4>
  )
}

function renderTable(block: Extract<MarkdownBlock, { type: 'table' }>, key: number) {
  const hasHeader = block.rows.length > 1 && isTableSeparator(block.rows[1])
  const header = hasHeader ? block.rows[0] : null
  const body = hasHeader ? block.rows.slice(2) : block.rows

  return (
    <div key={key} className="my-8 overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-[680px] w-full border-collapse text-left text-sm">
        {header ? (
          <thead className="bg-white/[0.045] text-xs uppercase tracking-[0.12em] text-zinc-400">
            <tr>
              {header.map((cell, cellIndex) => (
                <th key={cellIndex} className="border-b border-white/10 px-4 py-3 font-medium">
                  {renderInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody className="divide-y divide-white/10">
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 leading-6 text-zinc-400">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderBlock(block: MarkdownBlock, key: number) {
  switch (block.type) {
    case 'heading':
      return <div key={key}>{renderHeading(block)}</div>
    case 'paragraph':
      return (
        <p key={key} className="mt-5 text-[15px] leading-8 text-zinc-400">
          {renderInline(block.text)}
        </p>
      )
    case 'blockquote':
      return (
        <blockquote key={key} className="my-7 border-l border-sky-300/40 bg-white/[0.025] px-5 py-4 text-[15px] leading-8 text-zinc-300">
          {renderInline(block.text)}
        </blockquote>
      )
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag
          key={key}
          className={`my-5 space-y-3 pl-6 text-[15px] leading-7 text-zinc-400 ${block.ordered ? 'list-decimal' : 'list-disc'}`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </Tag>
      )
    }
    case 'code':
      return (
        <pre key={key} className="my-7 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 text-sm leading-7 text-zinc-200">
          <code>{block.code}</code>
        </pre>
      )
    case 'table':
      return renderTable(block, key)
    case 'footnote':
      return (
        <p key={key} id={`fn-${block.id}`} className="mt-4 text-xs leading-6 text-zinc-500">
          <sup>[{block.id}]</sup> {renderInline(block.text)}
        </p>
      )
    case 'hr':
      return <hr key={key} className="my-10 border-white/10" />
  }
}

export function WhitepaperPage() {
  const { markdown, sourceLabel } = readWhitepaper()
  const { blocks, toc } = parseMarkdown(markdown)
  const titleBlock = blocks.find((block): block is Extract<MarkdownBlock, { type: 'heading' }> => block.type === 'heading' && block.depth === 1)
  const articleBlocks = titleBlock ? blocks.slice(blocks.indexOf(titleBlock) + 1) : blocks
  const chapterCount = toc.filter((item) => item.depth === 2).length

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 ai-grid-bg">
      <div aria-hidden className="ai-app-mesh" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-white">
              AI 共險基金
            </Link>
            <nav className="hidden items-center gap-2 md:flex">
              <Link href="/" className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200">
                首頁
              </Link>
              <Link href="/app/dashboard" className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200">
                共享監控
              </Link>
              <Link href="/whitepaper" className="rounded-lg bg-white/[0.08] px-3 py-2 text-sm text-white">
                白皮書
              </Link>
            </nav>
          </div>
          <WalletAccountMenu compact />
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-10 pt-16">
        <Badge tone="info">Whitepaper · 草案 v0.4</Badge>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-white sm:text-6xl">
              {titleBlock?.text ?? 'AI 共險基金白皮書'}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">
              直接從專案白皮書 Markdown 讀取，方便 Demo 訪客瀏覽協議願景、核心機制、數學模型、風險分析與落地路線圖。
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 ai-glass-surface p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">source</p>
            <p className="mt-3 break-words font-mono text-sm text-zinc-300">{sourceLabel}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/[0.028] p-3">
                <p className="font-mono text-xs text-zinc-500">sections</p>
                <p className="mt-2 text-xl font-semibold text-white">{chapterCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.028] p-3">
                <p className="font-mono text-xs text-zinc-500">format</p>
                <p className="mt-2 text-xl font-semibold text-white">Markdown</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-6 px-6 pb-24 xl:grid-cols-[18rem_1fr]">
        <aside className="hidden xl:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-white/10 ai-glass-surface p-4">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">contents</p>
            <nav className="mt-4 space-y-1">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block rounded-lg px-3 py-2 text-sm leading-5 transition hover:bg-white/[0.045] hover:text-white ${
                    item.depth === 3 ? 'ml-3 text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="rounded-2xl border border-white/10 ai-glass-surface px-5 py-7 shadow-2xl shadow-black/20 sm:px-8 lg:px-10">
          <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-white/10 pb-6 text-xs text-zinc-500">
            <span className="font-mono">browse.whitepaper.md</span>
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
            <span>透明、自動執行、雙邊究責、不可操控</span>
          </div>
          {articleBlocks.map((block, index) => renderBlock(block, index))}
        </article>
      </div>
    </main>
  )
}

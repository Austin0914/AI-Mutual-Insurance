import type { ReactNode } from 'react'

export function Panel({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 ai-glass-surface p-5 shadow-2xl shadow-black/15 ${glow ? 'ai-card-glow' : ''} ${className}`}
    >
      {children}
    </section>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  detail?: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'danger'
}) {
  const toneClass = {
    neutral: 'text-zinc-100',
    good: 'text-emerald-300',
    warn: 'text-amber-300',
    danger: 'text-red-300',
  }[tone]

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.028] p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className={`mt-3 break-words text-2xl font-semibold ${toneClass}`}>{value}</div>
      {detail ? <p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p> : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'info'
}) {
  const toneClass = {
    neutral: 'border-white/10 bg-white/[0.04] text-zinc-300',
    good: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    warn: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    danger: 'border-red-400/20 bg-red-400/10 text-red-200',
    info: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  }[tone]

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${toneClass}`}>
      {children}
    </span>
  )
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-lg ai-gradient-button px-4 py-2 text-sm font-medium transition"
    >
      {children}
    </a>
  )
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      {children}
    </a>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p> : null}
      <h2 className="mt-3 text-2xl font-semibold text-zinc-100 sm:text-3xl">{title}</h2>
      {children ? <p className="mt-3 text-base leading-7 text-zinc-400">{children}</p> : null}
    </div>
  )
}

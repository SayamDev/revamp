import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Priority } from '@/types'

type Tone = 'neutral' | 'accent' | 'positive' | 'warning' | 'critical' | 'info'

const TONES: Record<Tone, string> = {
  neutral: 'bg-raised text-ink-500 border-line-strong',
  accent: 'bg-accent-soft text-accent-ink border-accent-soft',
  positive: 'bg-positive-soft text-positive border-positive-soft',
  warning: 'bg-warning-soft text-warning border-warning-soft',
  critical: 'bg-critical-soft text-critical border-critical-soft',
  info: 'bg-info-soft text-info border-info-soft',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5',
        'text-[11px] font-medium tracking-[0.02em] uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const PRIORITY_TONE: Record<Priority, Tone> = {
  urgent: 'critical',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]} className={className}>
      {priority}
    </Badge>
  )
}

export function StatusDot({ tone = 'neutral' }: { tone?: Tone }) {
  const colour: Record<Tone, string> = {
    neutral: 'bg-ink-300',
    accent: 'bg-accent',
    positive: 'bg-positive',
    warning: 'bg-warning',
    critical: 'bg-critical',
    info: 'bg-info',
  }
  return <span aria-hidden className={cn('inline-block size-1.5 shrink-0 rounded-full', colour[tone])} />
}

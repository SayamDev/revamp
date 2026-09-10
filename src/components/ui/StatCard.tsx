import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Delta } from '@/analytics/metrics'
import { formatSignedPercent } from '@/lib/format'
import { cn } from '@/lib/cn'

const DIRECTION_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }

export function StatCard({
  label,
  value,
  change,
  /** Whether an increase in this metric is good, bad, or neither. */
  sentiment = 'positive-up',
  footnote,
}: {
  label: string
  value: string
  change?: Delta
  sentiment?: 'positive-up' | 'positive-down' | 'neutral'
  footnote?: string
}) {
  const Icon = change ? DIRECTION_ICON[change.direction] : null

  const tone = (() => {
    if (!change || change.direction === 'flat' || sentiment === 'neutral') return 'text-ink-400'
    const good = sentiment === 'positive-up' ? change.direction === 'up' : change.direction === 'down'
    return good ? 'text-positive' : 'text-critical'
  })()

  return (
    <div className="card px-4 py-3.5">
      <p className="text-[12px] font-medium tracking-[0.01em] text-ink-500">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink-900">
          {value}
        </span>
        {change && Icon && (
          <span className={cn('tabular inline-flex items-center gap-0.5 text-[12px] font-medium', tone)}>
            <Icon aria-hidden className="size-3" />
            {formatSignedPercent(change.percent)}
          </span>
        )}
      </div>
      {footnote && <p className="mt-1.5 text-[12px] text-ink-400">{footnote}</p>}
    </div>
  )
}

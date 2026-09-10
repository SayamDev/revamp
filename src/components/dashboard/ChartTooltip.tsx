export interface ChartTooltipProps {
  active?: boolean
  payload?: { name?: string; value?: number; dataKey?: string | number }[]
  label?: string | number
  /** Formats the value, e.g. as currency. Defaults to the raw number. */
  formatter?: (value: number) => string
  /** Human label per series key, so a tooltip reads "Qualified 21" not "qualified 21". */
  seriesLabels?: Record<string, string>
}

export function ChartTooltip({ active, payload, label, formatter, seriesLabels }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-2 shadow-[var(--shadow-raised)]">
      <p className="text-[11px] font-medium text-ink-500">{label}</p>
      {payload.map((entry) => {
        const key = String(entry.dataKey)
        return (
          <p key={key} className="tabular text-[12px] text-ink-900">
            {seriesLabels?.[key] && <span className="text-ink-500">{seriesLabels[key]} </span>}
            <span className="font-semibold">{formatter ? formatter(entry.value ?? 0) : entry.value}</span>
          </p>
        )
      })}
    </div>
  )
}

/**
 * Legend for a multi-series chart. Each series carries a line style as well as
 * a colour, so the chart is still readable without colour perception.
 */
export function ChartLegend({
  items,
}: {
  items: { label: string; colour: string; dashed?: boolean }[]
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-1">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <svg aria-hidden width="14" height="8" viewBox="0 0 14 8" className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="14"
              y2="4"
              stroke={item.colour}
              strokeWidth="2"
              strokeDasharray={item.dashed ? '4 3' : undefined}
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  )
}

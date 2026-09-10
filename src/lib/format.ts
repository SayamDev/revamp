const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

export const formatCurrency = (value: number) => gbp.format(value)

export const formatCurrencyRange = (range: { min: number; max: number }) =>
  `${gbp.format(range.min)}–${gbp.format(range.max)}`

export const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value)

export const formatPercent = (value: number, dp = 1) => `${value.toFixed(dp)}%`

export const formatSignedPercent = (value: number | null, dp = 1) =>
  value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(dp)}%`

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

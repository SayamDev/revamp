const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export const formatTime = (iso: string) => timeFormatter.format(new Date(iso))

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${dateFormatter.format(date)}, ${timeFormatter.format(date)}`
}

/** "12m ago", "3h ago", "Yesterday", "4 Mar". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diffMinutes = Math.round((now.getTime() - then.getTime()) / 60_000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return dateFormatter.format(then)
}

/** "Today, 14:00" / "Tomorrow, 09:00" / "Overdue" aware due-date label. */
export function dueLabel(iso: string, now: Date = new Date()): { text: string; overdue: boolean } {
  const due = new Date(iso)
  const overdue = due.getTime() < now.getTime()
  const sameDay = due.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  if (sameDay) return { text: `Today, ${timeFormatter.format(due)}`, overdue }
  if (due.toDateString() === tomorrow.toDateString()) {
    return { text: `Tomorrow, ${timeFormatter.format(due)}`, overdue }
  }
  return { text: formatDateTime(iso), overdue }
}

export const hoursFromNow = (hours: number, from: Date = new Date()) =>
  new Date(from.getTime() + hours * 3_600_000).toISOString()

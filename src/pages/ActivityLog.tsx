import { useMemo, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  FileText,
  Inbox,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  User,
  Workflow,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/States'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useRevampStore } from '@/store/useRevampStore'
import type { Activity, ActivityKind } from '@/types'
import { formatTime, relativeTime } from '@/lib/time'
import { cn } from '@/lib/cn'

const ICONS: Record<ActivityKind, LucideIcon> = {
  enquiry_received: Inbox,
  ai_analysis: Bot,
  ai_extraction: FileText,
  task_created: ListChecks,
  task_completed: CheckCircle2,
  draft_generated: FileText,
  approval_pending: ShieldAlert,
  approval_granted: ShieldCheck,
  approval_rejected: XCircle,
  automation_run: Workflow,
  issue_escalated: ShieldAlert,
  system: User,
}

const ACTOR_STYLE: Record<Activity['actor'], string> = {
  ai: 'text-accent bg-accent-soft',
  human: 'text-positive bg-positive-soft',
  automation: 'text-info bg-info-soft',
  system: 'text-ink-500 bg-raised',
}

const ACTOR_LABEL: Record<Activity['actor'], string> = {
  ai: 'AI',
  human: 'Person',
  automation: 'Automation',
  system: 'System',
}

type Filter = 'all' | 'ai' | 'human' | 'automation'

function groupByDay(activities: Activity[]): [string, Activity[]][] {
  const groups = new Map<string, Activity[]>()
  for (const activity of activities) {
    const key = new Date(activity.at).toDateString()
    const bucket = groups.get(key)
    if (bucket) bucket.push(activity)
    else groups.set(key, [activity])
  }
  return [...groups.entries()]
}

export function ActivityLogPage() {
  const activities = useRevampStore((state) => state.activities)
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(
    () =>
      [...activities]
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .filter((activity) => (filter === 'all' ? true : activity.actor === filter)),
    [activities, filter],
  )

  const grouped = useMemo(() => groupByDay(visible), [visible])
  const today = new Date().toDateString()

  return (
    <Card>
      <CardHeader
        title="Activity log"
        description="Every AI decision, automated step and human approval, in order. This is what makes the automation auditable."
        action={
          <SegmentedControl
            name="activity-filter"
            legend="Filter activity by actor"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: activities.length },
              { value: 'ai', label: 'AI', count: activities.filter((a) => a.actor === 'ai').length },
              { value: 'automation', label: 'Automation', count: activities.filter((a) => a.actor === 'automation').length },
              { value: 'human', label: 'People', count: activities.filter((a) => a.actor === 'human').length },
            ]}
          />
        }
      />

      {visible.length === 0 ? (
        <EmptyState title="Nothing recorded yet" description="Actions taken in Revamp appear here immediately." />
      ) : (
        <div className="px-5 py-4">
          {grouped.map(([day, entries]) => (
            <section key={day} className="mb-6 last:mb-0">
              <h3 className="mb-3 text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                {day === today ? 'Today' : new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              </h3>
              <ol className="relative space-y-0">
                <span aria-hidden className="absolute top-2 bottom-2 left-[15px] w-px bg-line" />
                {entries.map((activity) => {
                  const Icon = ICONS[activity.kind] ?? User
                  return (
                    <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                      <span
                        className={cn(
                          'relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-line',
                          ACTOR_STYLE[activity.actor],
                        )}
                      >
                        <Icon aria-hidden className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <p className="text-[13.5px] font-medium text-ink-900">{activity.message}</p>
                          <span className="tabular text-[12px] text-ink-400">{formatTime(activity.at)}</span>
                        </div>
                        {activity.detail && (
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{activity.detail}</p>
                        )}
                        <p className="mt-1 text-[11px] text-ink-400">
                          {ACTOR_LABEL[activity.actor]} · {relativeTime(activity.at)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Card>
  )
}

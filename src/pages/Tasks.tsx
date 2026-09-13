import { useMemo, useState } from 'react'
import { Check, ListChecks, RotateCcw } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/States'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useRevampStore } from '@/store/useRevampStore'
import { toast } from '@/store/toastStore'
import { sortByPriority } from '@/analytics/metrics'
import { dueLabel } from '@/lib/time'
import { cn } from '@/lib/cn'

type Filter = 'open' | 'done' | 'all'
type Sort = 'priority' | 'due'

export function TasksPage() {
  const tasks = useRevampStore((state) => state.tasks)
  const completeTask = useRevampStore((state) => state.completeTask)
  const reopenTask = useRevampStore((state) => state.reopenTask)

  const [filter, setFilter] = useState<Filter>('open')
  const [sort, setSort] = useState<Sort>('priority')

  const visible = useMemo(() => {
    const base = tasks.filter((task) =>
      filter === 'open' ? task.status !== 'done' : filter === 'done' ? task.status === 'done' : true,
    )
    return sort === 'priority'
      ? sortByPriority(base)
      : [...base].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
  }, [tasks, filter, sort])

  const counts = {
    open: tasks.filter((task) => task.status !== 'done').length,
    done: tasks.filter((task) => task.status === 'done').length,
    all: tasks.length,
  }

  return (
    <Card>
      <CardHeader
        title="Tasks"
        description="Work created by automations and by people, in one queue. Completing a task writes to the audit trail."
        action={
          <div className="flex flex-wrap gap-2">
            <SegmentedControl
              name="task-filter"
              legend="Filter tasks by status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'open', label: 'Open', count: counts.open },
                { value: 'done', label: 'Done', count: counts.done },
                { value: 'all', label: 'All', count: counts.all },
              ]}
            />
            <SegmentedControl
              name="task-sort"
              legend="Sort tasks"
              value={sort}
              onChange={setSort}
              options={[
                { value: 'priority', label: 'Priority' },
                { value: 'due', label: 'Due' },
              ]}
            />
          </div>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<ListChecks aria-hidden className="size-6" />}
          title={filter === 'open' ? 'No open tasks' : 'Nothing here'}
          description={
            filter === 'open'
              ? 'Everything assigned has been completed. Run an automation to create more.'
              : 'Change the filter to see other tasks.'
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((task) => {
            const due = dueLabel(task.dueAt)
            const done = task.status === 'done'
            return (
              <li key={task.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[13.5px] font-medium',
                      done ? 'text-ink-400 line-through' : 'text-ink-900',
                    )}
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{task.detail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-400">
                    <span>{task.assignee}</span>
                    <span aria-hidden>·</span>
                    <span className={cn(!done && due.overdue && 'font-medium text-critical')}>
                      {done ? 'Completed' : due.overdue ? `Overdue — ${due.text}` : due.text}
                    </span>
                    <span aria-hidden>·</span>
                    <span>Source: {task.source}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {task.status === 'in_progress' && <Badge tone="info">In progress</Badge>}
                  <PriorityBadge priority={task.priority} />
                  {done ? (
                    <Button size="sm" variant="ghost" onClick={() => reopenTask(task.id)}>
                      <RotateCcw aria-hidden className="size-3.5" />
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        completeTask(task.id)
                        toast.success('Task completed', task.title)
                      }}
                    >
                      <Check aria-hidden className="size-3.5" />
                      Complete
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

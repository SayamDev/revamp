import { CalendarClock, CheckCircle2, Play, XCircle, Zap } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusDot } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/States'
import { AUTOMATION_LIST } from '@/automation/definitions'
import type { AutomationDefinition } from '@/automation/types'
import { useRevampStore } from '@/store/useRevampStore'
import { toast } from '@/store/toastStore'
import { relativeTime } from '@/lib/time'
import { N8N_CONFIGURED } from '@/automation/config'

/**
 * One workflow: what triggers it, the steps it runs, how often it has run, and
 * the per-step result of the last run. Running it here uses the same service
 * the inbox does, so an n8n-backed run looks identical apart from the adapter
 * label.
 */
export function AutomationCard({ definition }: { definition: AutomationDefinition }) {
  const enquiries = useRevampStore((state) => state.enquiries)
  const issues = useRevampStore((state) => state.issues)
  const runs = useRevampStore((state) => state.runs)
  const weeks = useRevampStore((state) => state.weeks)
  const runAutomation = useRevampStore((state) => state.runAutomation)
  const pending = useRevampStore((state) => state.pending[`automation:${definition.id}`])

  const loading = pending?.status === 'loading'
  const ownRuns = runs.filter((run) => run.automationId === definition.id)
  const lastRun = ownRuns[0]

  // Historic counts come from the seeded weekly metrics so the card does not
  // read "0 runs" on a fresh demo; session runs are added on top.
  const historicRuns = Math.round(
    weeks.reduce((total, week) => total + week.automationRuns, 0) / AUTOMATION_LIST.length,
  )

  const nextEnquiry = enquiries.find((enquiry) => !enquiry.analysis)
  const nextIssue = issues.find((issue) => issue.status !== 'resolved')

  const blocked =
    definition.id === 'new_enquiry'
      ? !nextEnquiry && 'Every enquiry in the demo has already been analysed. Reset the demo data to run it again.'
      : definition.id === 'customer_complaint'
        ? !nextIssue && 'No unresolved support issues remain in the dataset.'
        : false

  const trigger = async () => {
    const input =
      definition.id === 'new_enquiry'
        ? { enquiry: nextEnquiry }
        : definition.id === 'customer_complaint'
          ? { issue: nextIssue }
          : {}
    await runAutomation(definition.id, input)
    const outcome = useRevampStore.getState().pending[`automation:${definition.id}`]
    if (outcome?.status === 'error') {
      toast.error('Automation failed', outcome.error ?? undefined)
    } else {
      toast.success(`${definition.name} completed`, `${definition.steps.length} steps executed.`)
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {definition.name}
            <Badge tone="positive">
              <StatusDot tone="positive" />
              Active
            </Badge>
          </span>
        }
        description={definition.description}
        action={
          <Button size="sm" variant="primary" loading={loading} disabled={Boolean(blocked)} onClick={() => void trigger()}>
            {!loading && <Play aria-hidden className="size-3.5" />}
            Run now
          </Button>
        }
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
          {definition.triggerKind === 'schedule' ? (
            <CalendarClock aria-hidden className="size-3.5 text-ink-400" />
          ) : (
            <Zap aria-hidden className="size-3.5 text-ink-400" />
          )}
          <span className="font-medium text-ink-700">Trigger</span>
          <span>{definition.trigger}</span>
        </div>

        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {definition.steps.map((step, index) => (
            <li key={step.key} className="flex items-center gap-1.5">
              <span
                className="rounded border border-line bg-raised px-2 py-1 text-[12px] font-medium text-ink-700"
                title={step.description}
              >
                {step.name}
              </span>
              {index < definition.steps.length - 1 && (
                <span aria-hidden className="text-[12px] text-ink-400">
                  ›
                </span>
              )}
            </li>
          ))}
        </ol>

        {blocked && (
          <p className="rounded-md border border-line bg-raised px-3 py-2 text-[12.5px] text-ink-500">
            {blocked}
          </p>
        )}

        {pending?.status === 'error' && (
          <ErrorState
            title="The workflow did not complete"
            description={pending.error ?? 'An unexpected error stopped the run. Nothing was changed.'}
            onRetry={() => void trigger()}
          />
        )}

        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">Last run</dt>
            <dd className="tabular mt-0.5 text-[13px] text-ink-900">
              {lastRun ? relativeTime(lastRun.at) : 'Not in this session'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">Runs</dt>
            <dd className="tabular mt-0.5 text-[13px] text-ink-900">{historicRuns + ownRuns.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">Executed by</dt>
            <dd className="mt-0.5 text-[13px] text-ink-900">
              {lastRun ? (lastRun.adapter === 'n8n' ? 'n8n' : 'Local engine') : N8N_CONFIGURED ? 'n8n if reachable' : 'Local engine'}
            </dd>
          </div>
        </dl>

        {lastRun && (
          <ul className="space-y-1.5 border-t border-line pt-3">
            {lastRun.steps.map((step) => (
              <li key={step.name} className="flex items-start gap-2 text-[12.5px]">
                {step.status === 'success' ? (
                  <CheckCircle2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-positive" />
                ) : (
                  <XCircle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-critical" />
                )}
                <span className="font-medium text-ink-700">{step.name}</span>
                <span className="min-w-0 flex-1 truncate text-ink-500">{step.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

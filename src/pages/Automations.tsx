import { useMemo } from 'react'
import { CalendarClock, CheckCircle2, Play, ServerCog, XCircle, Zap } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusDot } from '@/components/ui/Badge'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { AUTOMATION_LIST } from '@/automation/definitions'
import type { AutomationDefinition, AutomationId } from '@/automation/types'
import { useRelayStore } from '@/store/useRelayStore'
import { toast } from '@/store/toastStore'
import { relativeTime } from '@/lib/time'

const N8N_CONFIGURED = Boolean(import.meta.env.VITE_N8N_WEBHOOK_URL)

function AutomationCard({ definition }: { definition: AutomationDefinition }) {
  const enquiries = useRelayStore((state) => state.enquiries)
  const issues = useRelayStore((state) => state.issues)
  const runs = useRelayStore((state) => state.runs)
  const weeks = useRelayStore((state) => state.weeks)
  const runAutomation = useRelayStore((state) => state.runAutomation)
  const pending = useRelayStore((state) => state.pending[`automation:${definition.id}`])

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
    const outcome = useRelayStore.getState().pending[`automation:${definition.id}`]
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
                <span aria-hidden className="text-[12px] text-ink-300">
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

export function AutomationsPage() {
  const runs = useRelayStore((state) => state.runs)
  const totalDuration = useMemo(
    () => runs.reduce((total, run) => total + run.durationMs, 0),
    [runs],
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-start gap-3">
          <ServerCog aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink-900">
              Workflows run on the local engine by default
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
              Relay executes these steps in-process, so the demo works with no external services and no running
              cost.{' '}
              {N8N_CONFIGURED
                ? 'An n8n webhook is configured: if it is reachable, n8n executes the workflow instead and Relay falls back automatically if it is not.'
                : 'An n8n instance can be plugged in behind the same interface — see the README for the Docker setup.'}
            </p>
          </div>
          <Badge tone={N8N_CONFIGURED ? 'accent' : 'neutral'}>
            {N8N_CONFIGURED ? 'n8n configured' : 'Local engine'}
          </Badge>
        </CardBody>
      </Card>

      {AUTOMATION_LIST.map((definition) => (
        <AutomationCard key={definition.id} definition={definition} />
      ))}

      <Card>
        <CardHeader
          title="Run history"
          description={
            runs.length > 0
              ? `${runs.length} run${runs.length === 1 ? '' : 's'} in this session · ${(totalDuration / 1000).toFixed(1)}s total`
              : 'Runs from this session appear here.'
          }
        />
        {runs.length === 0 ? (
          <EmptyState
            title="No runs yet"
            description="Trigger an automation above, or open an enquiry in the inbox and run the analysis."
          />
        ) : (
          <ul className="divide-y divide-line">
            {runs.map((run) => (
              <li key={run.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3">
                {run.status === 'success' ? (
                  <CheckCircle2 aria-hidden className="size-3.5 shrink-0 text-positive" />
                ) : (
                  <XCircle aria-hidden className="size-3.5 shrink-0 text-critical" />
                )}
                <span className="text-[13.5px] font-medium text-ink-900">
                  {AUTOMATION_LIST.find((a) => a.id === (run.automationId as AutomationId))?.name ?? run.automationId}
                </span>
                <span className="text-[12.5px] text-ink-500">{run.steps.length} steps</span>
                <Badge tone="neutral">{run.adapter === 'n8n' ? 'n8n' : 'Local'}</Badge>
                <span className="tabular ml-auto text-[12px] text-ink-400">
                  {run.durationMs}ms · {relativeTime(run.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

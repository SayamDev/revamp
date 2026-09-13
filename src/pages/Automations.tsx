import { useMemo } from 'react'
import { CheckCircle2, ServerCog, XCircle } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/States'
import { AutomationCard } from '@/components/automations/AutomationCard'
import { N8N_CONFIGURED } from '@/automation/config'
import { AUTOMATION_LIST } from '@/automation/definitions'
import type { AutomationId } from '@/automation/types'
import { useRevampStore } from '@/store/useRevampStore'
import { relativeTime } from '@/lib/time'

export function AutomationsPage() {
  const runs = useRevampStore((state) => state.runs)
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
              Revamp executes these steps in-process, so the demo works with no external services and no running
              cost.{' '}
              {N8N_CONFIGURED
                ? 'An n8n webhook is configured: if it is reachable, n8n executes the workflow instead and Revamp falls back automatically if it is not.'
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
                  {AUTOMATION_LIST.find((automation) => automation.id === (run.automationId as AutomationId))?.name ??
                    run.automationId}
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

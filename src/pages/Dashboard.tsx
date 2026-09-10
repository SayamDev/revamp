import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowRight, Clock, Sparkles } from 'lucide-react'
import { GuidedStart } from '@/components/GuidedStart'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonLines } from '@/components/ui/States'
import { useRelayStore } from '@/store/useRelayStore'
import {
  breachedSla,
  compareWeeks,
  computeDashboardMetrics,
  delta,
  pipelineByStage,
  sortByPriority,
} from '@/analytics/metrics'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { relativeTime } from '@/lib/time'

const AXIS = { fontSize: 11, fill: 'var(--color-ink-400)' }

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; dataKey?: string | number }[]
  label?: string | number
  formatter?: (value: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-line bg-surface px-2.5 py-2 shadow-[var(--shadow-raised)]">
      <p className="text-[11px] font-medium text-ink-500">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="tabular text-[12px] font-semibold text-ink-900">
          {formatter ? formatter(entry.value ?? 0) : entry.value}
        </p>
      ))}
    </div>
  )
}

function BriefingCard() {
  const briefing = useRelayStore((state) => state.briefing)
  const generateBriefing = useRelayStore((state) => state.generateBriefing)
  const pending = useRelayStore((state) => state.pending['briefing'])
  const providerKey = useRelayStore((state) => state.providerKey)
  const seededAt = useRelayStore((state) => state.seededAt)

  const loading = pending?.status === 'loading'

  // Generate once per seeded dataset; the user refreshes it manually after
  // that. Keying the guard on `seededAt` rather than a boolean means resetting
  // the demo produces a fresh briefing instead of an empty card, while still
  // stopping StrictMode's double-invoked effect from running it twice.
  const requestedFor = useRef<string | null>(null)
  useEffect(() => {
    if (briefing || loading || requestedFor.current === seededAt) return
    requestedFor.current = seededAt
    void generateBriefing()
  }, [briefing, loading, seededAt, generateBriefing])

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Today&apos;s briefing
            <Badge tone="accent">
              <Sparkles aria-hidden className="size-3" />
              {providerKey === 'ollama' ? 'Local AI' : 'Demo AI'}
            </Badge>
          </span>
        }
        description="Generated from the business data below, not from free text."
        action={
          <Button size="sm" loading={loading} onClick={() => void generateBriefing()}>
            Refresh
          </Button>
        }
      />
      <CardBody>
        {pending?.status === 'error' ? (
          <ErrorState
            title="AI analysis failed"
            description="We couldn't complete the briefing. You can retry, or keep using the dashboard — every figure below is calculated independently of the AI layer."
            onRetry={() => void generateBriefing()}
          />
        ) : loading && !briefing ? (
          <SkeletonLines lines={5} />
        ) : briefing ? (
          <div className="fade-in space-y-4">
            <p className="text-[15px] leading-snug font-semibold tracking-[-0.01em] text-ink-900">
              {briefing.headline}
            </p>
            <dl className="grid gap-4 sm:grid-cols-3">
              {briefing.sections.map((section) => (
                <div key={section.heading}>
                  <dt className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                    {section.heading}
                  </dt>
                  <dd className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{section.body}</dd>
                </div>
              ))}
            </dl>
            {briefing.recommendations.length > 0 && (
              <div className="rounded-md border border-line bg-raised px-4 py-3">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                  Recommended actions
                </p>
                <ul className="mt-2 space-y-1.5">
                  {briefing.recommendations.map((recommendation) => (
                    <li key={recommendation} className="flex gap-2 text-[13px] leading-relaxed text-ink-700">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/tasks"
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-900 transition-colors hover:bg-raised hover:border-ink-300"
                >
                  Review recommendations
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
            )}
            <p className="text-[11px] text-ink-300">
              Generated {relativeTime(briefing.generatedAt)} · engine: {briefing.providerId}
            </p>
          </div>
        ) : (
          <EmptyState title="No briefing yet" description="Generate one to see what changed today." />
        )}
      </CardBody>
    </Card>
  )
}

export function DashboardPage() {
  const state = useRelayStore()

  const metrics = useMemo(
    () =>
      computeDashboardMetrics({
        leads: state.leads,
        opportunities: state.opportunities,
        issues: state.issues,
        tasks: state.tasks,
        enquiries: state.enquiries,
        weeks: state.weeks,
        automationRuns:
          state.weeks.reduce((total, week) => total + week.automationRuns, 0) + state.runs.length,
      }),
    [state.leads, state.opportunities, state.issues, state.tasks, state.enquiries, state.weeks, state.runs],
  )

  const comparison = useMemo(() => compareWeeks(state.weeks), [state.weeks])
  const overdue = useMemo(() => breachedSla(state.enquiries), [state.enquiries])
  const openIssues = useMemo(
    () => sortByPriority(state.issues.filter((issue) => issue.status !== 'resolved')).slice(0, 4),
    [state.issues],
  )

  const leadSeries = state.weeks.map((week) => ({
    label: week.label,
    leads: week.leads,
    qualified: week.qualifiedLeads,
  }))
  const pipelineSeries = pipelineByStage(state.opportunities)

  return (
    <div className="space-y-6">
      <GuidedStart />

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="New leads"
          value={formatNumber(metrics.newLeads)}
          change={comparison ? comparison.leads : undefined}
          footnote="New and qualified, not yet decided"
        />
        <StatCard
          label="Open opportunities"
          value={formatNumber(metrics.openOpportunities)}
          footnote={`${formatCurrency(state.opportunities.reduce((total, o) => total + o.value, 0))} gross value`}
        />
        <StatCard
          label="Customer issues"
          value={formatNumber(metrics.customerIssues)}
          sentiment="positive-down"
          change={comparison ? delta(comparison.current.issues, comparison.previous.issues) : undefined}
          footnote={`${state.issues.filter((i) => i.status === 'escalated').length} escalated`}
        />
        <StatCard
          label="Conversion rate"
          value={formatPercent(metrics.conversionRate)}
          change={comparison ? comparison.conversion : undefined}
          footnote="Won as a share of decided leads"
        />
        <StatCard
          label="Automated actions"
          value={formatNumber(metrics.automatedActions)}
          footnote={`${state.runs.length} run in this session`}
        />
        <StatCard
          label="Estimated pipeline"
          value={formatCurrency(metrics.estimatedPipeline)}
          footnote="Weighted by stage probability"
        />
      </section>

      <BriefingCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Leads over time" description="Total against qualified, by week." />
          <CardBody className="pl-1">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadSeries} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-line-strong)' }} />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#leadFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="qualified"
                    stroke="var(--color-ink-300)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pipeline by stage" description="Gross opportunity value." />
          <CardBody className="pl-1">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineSeries} margin={{ top: 6, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="stage" tick={AXIS} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={AXIS}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={(value: number) => `£${Math.round(value / 1000)}k`}
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={formatCurrency} />}
                    cursor={{ fill: 'var(--color-raised)' }}
                  />
                  <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={54} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Needs a response"
            description="Enquiries past the window their assigned priority sets."
            action={
              <Link
                to="/inbox"
                className="text-[13px] font-medium text-accent hover:text-accent-ink hover:underline"
              >
                Open inbox
              </Link>
            }
          />
          {overdue.length === 0 ? (
            <EmptyState
              icon={<Clock aria-hidden className="size-6" />}
              title="Nothing is overdue"
              description="Every analysed enquiry is still inside its response window."
            />
          ) : (
            <ul className="divide-y divide-line">
              {overdue.slice(0, 4).map((enquiry) => (
                <li key={enquiry.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-900">{enquiry.company}</p>
                    <p className="truncate text-[12.5px] text-ink-500">{enquiry.subject}</p>
                  </div>
                  {enquiry.analysis && <PriorityBadge priority={enquiry.analysis.priority} />}
                  <span className="tabular shrink-0 text-[12px] text-ink-400">
                    {relativeTime(enquiry.receivedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Open customer issues" description="Highest priority first." />
          {openIssues.length === 0 ? (
            <EmptyState title="No open issues" description="Every reported issue has been resolved." />
          ) : (
            <ul className="divide-y divide-line">
              {openIssues.map((issue) => (
                <li key={issue.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-900">{issue.title}</p>
                    <p className="truncate text-[12.5px] text-ink-500">
                      {issue.company} · {issue.category.replace('_', ' ')}
                    </p>
                  </div>
                  <PriorityBadge priority={issue.priority} />
                  {issue.status === 'escalated' && <Badge tone="critical">Escalated</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { GuidedStart } from '@/components/GuidedStart'
import { BriefingCard } from '@/components/dashboard/BriefingCard'
import { LeadsChart, PipelineChart } from '@/components/dashboard/DashboardCharts'
import { OpenIssues, OverdueEnquiries } from '@/components/dashboard/AttentionLists'
import { StatCard } from '@/components/ui/StatCard'
import { useRelayStore } from '@/store/useRelayStore'
import {
  breachedSla,
  compareWeeks,
  computeDashboardMetrics,
  delta,
  sortByPriority,
} from '@/analytics/metrics'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

/**
 * The executive view.
 *
 * Nothing here is hard-coded: every figure is derived from store state by the
 * pure functions in `@/analytics/metrics`, so completing a task or approving a
 * response changes what this page says.
 */
export function DashboardPage() {
  const enquiries = useRelayStore((state) => state.enquiries)
  const leads = useRelayStore((state) => state.leads)
  const opportunities = useRelayStore((state) => state.opportunities)
  const issues = useRelayStore((state) => state.issues)
  const tasks = useRelayStore((state) => state.tasks)
  const weeks = useRelayStore((state) => state.weeks)
  const runs = useRelayStore((state) => state.runs)

  const metrics = useMemo(
    () =>
      computeDashboardMetrics({
        leads,
        opportunities,
        issues,
        tasks,
        enquiries,
        weeks,
        automationRuns: weeks.reduce((total, week) => total + week.automationRuns, 0) + runs.length,
      }),
    [leads, opportunities, issues, tasks, enquiries, weeks, runs],
  )

  const comparison = useMemo(() => compareWeeks(weeks), [weeks])
  const overdue = useMemo(() => breachedSla(enquiries), [enquiries])
  const openIssues = useMemo(
    () => sortByPriority(issues.filter((issue) => issue.status !== 'resolved')).slice(0, 4),
    [issues],
  )
  const grossPipeline = useMemo(
    () => opportunities.reduce((total, opportunity) => total + opportunity.value, 0),
    [opportunities],
  )

  return (
    <div className="space-y-6">
      <GuidedStart />

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="New leads"
          value={formatNumber(metrics.newLeads)}
          change={comparison?.leads}
          footnote="New and qualified, not yet decided"
        />
        <StatCard
          label="Open opportunities"
          value={formatNumber(metrics.openOpportunities)}
          footnote={`${formatCurrency(grossPipeline)} gross value`}
        />
        <StatCard
          label="Customer issues"
          value={formatNumber(metrics.customerIssues)}
          sentiment="positive-down"
          change={comparison ? delta(comparison.current.issues, comparison.previous.issues) : undefined}
          footnote={`${issues.filter((issue) => issue.status === 'escalated').length} escalated`}
        />
        <StatCard
          label="Conversion rate"
          value={formatPercent(metrics.conversionRate)}
          change={comparison?.conversion}
          footnote="Won as a share of decided leads"
        />
        <StatCard
          label="Automated actions"
          value={formatNumber(metrics.automatedActions)}
          footnote={`${runs.length} run in this session`}
        />
        <StatCard
          label="Estimated pipeline"
          value={formatCurrency(metrics.estimatedPipeline)}
          footnote="Weighted by stage probability"
        />
      </section>

      <BriefingCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <LeadsChart weeks={weeks} />
        <PipelineChart opportunities={opportunities} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OverdueEnquiries enquiries={overdue} />
        <OpenIssues issues={openIssues} />
      </div>
    </div>
  )
}

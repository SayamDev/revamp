/**
 * Pure derivations over demo state. Every dashboard number comes from here,
 * so actions taken in the app (completing a task, approving a response)
 * change what the CEO sees.
 */
import type {
  Enquiry,
  Lead,
  Opportunity,
  Priority,
  SupportIssue,
  Task,
  WeeklyMetric,
} from '@/types'

export interface DashboardMetrics {
  newLeads: number
  openOpportunities: number
  customerIssues: number
  conversionRate: number
  automatedActions: number
  estimatedPipeline: number
  openTasks: number
  awaitingApproval: number
}

export interface Delta {
  absolute: number
  percent: number | null
  direction: 'up' | 'down' | 'flat'
}

export function delta(current: number, previous: number): Delta {
  const absolute = current - previous
  const percent = previous === 0 ? null : (absolute / previous) * 100
  const direction = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat'
  return { absolute, percent, direction }
}

export function round(value: number, dp = 1): number {
  const factor = 10 ** dp
  return Math.round(value * factor) / factor
}

export interface MetricsInput {
  leads: Lead[]
  opportunities: Opportunity[]
  issues: SupportIssue[]
  tasks: Task[]
  enquiries: Enquiry[]
  weeks: WeeklyMetric[]
  automationRuns: number
}

export function computeDashboardMetrics(input: MetricsInput): DashboardMetrics {
  const newLeads = input.leads.filter((lead) => lead.stage === 'new' || lead.stage === 'qualified').length
  const openOpps = input.opportunities.filter((opp) => opp.stage !== 'closing' || opp.probability < 100)
  const openIssues = input.issues.filter((issue) => issue.status !== 'resolved')

  const won = input.leads.filter((lead) => lead.stage === 'won').length
  const decided = input.leads.filter((lead) => lead.stage === 'won' || lead.stage === 'lost').length
  const conversionRate = decided === 0 ? 0 : (won / decided) * 100

  const estimatedPipeline = openOpps.reduce(
    (total, opp) => total + opp.value * (opp.probability / 100),
    0,
  )

  return {
    newLeads,
    openOpportunities: openOpps.length,
    customerIssues: openIssues.length,
    conversionRate: round(conversionRate, 1),
    automatedActions: input.automationRuns,
    estimatedPipeline: Math.round(estimatedPipeline),
    openTasks: input.tasks.filter((task) => task.status !== 'done').length,
    awaitingApproval: input.enquiries.filter((e) => e.status === 'awaiting_approval').length,
  }
}

export interface WeekComparison {
  current: WeeklyMetric
  previous: WeeklyMetric
  revenue: Delta
  leads: Delta
  qualifiedLeads: Delta
  conversion: Delta
  avgDealValue: Delta
  responseTime: Delta
  worstChannel: { channel: string; change: Delta } | null
  bestChannel: { channel: string; change: Delta } | null
}

const conversionOf = (week: WeeklyMetric) =>
  week.qualifiedLeads === 0 ? 0 : (week.won / week.qualifiedLeads) * 100

const avgDealOf = (week: WeeklyMetric) => (week.won === 0 ? 0 : week.revenue / week.won)

/** Compare the most recent two weeks. Returns null when there is not enough data. */
export function compareWeeks(weeks: WeeklyMetric[]): WeekComparison | null {
  if (weeks.length < 2) return null
  const current = weeks[weeks.length - 1]
  const previous = weeks[weeks.length - 2]

  const channels = new Set([
    ...Object.keys(current.channelBreakdown),
    ...Object.keys(previous.channelBreakdown),
  ])
  const channelDeltas = [...channels].map((channel) => ({
    channel,
    change: delta(current.channelBreakdown[channel] ?? 0, previous.channelBreakdown[channel] ?? 0),
  }))
  channelDeltas.sort((a, b) => a.change.absolute - b.change.absolute)

  return {
    current,
    previous,
    revenue: delta(current.revenue, previous.revenue),
    leads: delta(current.leads, previous.leads),
    qualifiedLeads: delta(current.qualifiedLeads, previous.qualifiedLeads),
    conversion: delta(conversionOf(current), conversionOf(previous)),
    avgDealValue: delta(avgDealOf(current), avgDealOf(previous)),
    responseTime: delta(current.avgResponseMinutes, previous.avgResponseMinutes),
    worstChannel: channelDeltas[0] ?? null,
    bestChannel: channelDeltas[channelDeltas.length - 1] ?? null,
  }
}

const PRIORITY_WEIGHT: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

export function sortByPriority<T extends { priority: Priority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority])
}

/** Enquiries whose SLA window has already elapsed without a response. */
export function breachedSla(enquiries: Enquiry[], now: Date = new Date()): Enquiry[] {
  return enquiries.filter((enquiry) => {
    if (!enquiry.analysis) return false
    if (enquiry.status === 'responded' || enquiry.status === 'archived') return false
    const received = new Date(enquiry.receivedAt).getTime()
    const elapsedHours = (now.getTime() - received) / 3_600_000
    return elapsedHours > enquiry.analysis.slaHours
  })
}

export function pipelineByStage(opportunities: Opportunity[]): { stage: string; value: number }[] {
  const stages: Opportunity['stage'][] = ['discovery', 'proposal', 'negotiation', 'closing']
  return stages.map((stage) => ({
    stage: stage[0].toUpperCase() + stage.slice(1),
    value: opportunities
      .filter((opp) => opp.stage === stage)
      .reduce((total, opp) => total + opp.value, 0),
  }))
}

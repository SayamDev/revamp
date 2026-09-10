import { describe, expect, it } from 'vitest'
import {
  breachedSla,
  compareWeeks,
  computeDashboardMetrics,
  delta,
  pipelineByStage,
  sortByPriority,
} from './metrics'
import { createSeedData } from '@/data/seed'
import type {
  Enquiry,
  EnquiryAnalysis,
  Lead,
  Opportunity,
  SupportIssue,
  Task,
  WeeklyMetric,
} from '@/types'

const seed = createSeedData(new Date('2026-09-10T12:00:00Z'))

const emptyInput = {
  leads: [] as Lead[],
  opportunities: [] as Opportunity[],
  issues: [] as SupportIssue[],
  tasks: [] as Task[],
  enquiries: [] as Enquiry[],
  weeks: [] as WeeklyMetric[],
  automationRuns: 0,
}

describe('delta', () => {
  it('reports direction and percentage change', () => {
    expect(delta(52, 42)).toEqual({ absolute: 10, percent: (10 / 42) * 100, direction: 'up' })
    expect(delta(42, 52).direction).toBe('down')
    expect(delta(5, 5).direction).toBe('flat')
  })

  it('returns a null percentage rather than dividing by zero', () => {
    expect(delta(3, 0).percent).toBeNull()
  })
})

describe('computeDashboardMetrics', () => {
  it('handles an empty business without throwing or dividing by zero', () => {
    const metrics = computeDashboardMetrics(emptyInput)
    expect(metrics.newLeads).toBe(0)
    expect(metrics.conversionRate).toBe(0)
    expect(metrics.estimatedPipeline).toBe(0)
  })

  it('counts only undecided leads as new leads', () => {
    const metrics = computeDashboardMetrics({ ...emptyInput, leads: seed.leads })
    const undecided = seed.leads.filter((lead) => lead.stage === 'new' || lead.stage === 'qualified').length
    expect(metrics.newLeads).toBe(undecided)
  })

  it('derives conversion from decided leads only', () => {
    const leads: Lead[] = [
      { ...seed.leads[0], stage: 'won' },
      { ...seed.leads[1], stage: 'lost' },
      { ...seed.leads[2], stage: 'lost' },
      { ...seed.leads[3], stage: 'lost' },
      { ...seed.leads[4], stage: 'new' },
    ]
    expect(computeDashboardMetrics({ ...emptyInput, leads }).conversionRate).toBe(25)
  })

  it('weights pipeline value by stage probability', () => {
    const opportunities: Opportunity[] = [
      { ...seed.opportunities[0], value: 10_000, probability: 50, stage: 'proposal' },
      { ...seed.opportunities[1], value: 20_000, probability: 25, stage: 'discovery' },
    ]
    expect(computeDashboardMetrics({ ...emptyInput, opportunities }).estimatedPipeline).toBe(10_000)
  })

  it('excludes resolved issues from the open issue count', () => {
    const metrics = computeDashboardMetrics({ ...emptyInput, issues: seed.issues })
    expect(metrics.customerIssues).toBe(seed.issues.filter((issue) => issue.status !== 'resolved').length)
  })
})

describe('compareWeeks', () => {
  it('returns null when there is not enough history', () => {
    expect(compareWeeks([])).toBeNull()
    expect(compareWeeks([seed.weeks[0]])).toBeNull()
  })

  it('compares the two most recent weeks', () => {
    const comparison = compareWeeks(seed.weeks)!
    expect(comparison.current.label).toBe('This week')
    expect(comparison.previous.label).toBe('Last week')
    expect(comparison.revenue.direction).toBe('down')
    expect(Math.round(comparison.revenue.percent!)).toBe(-14)
    expect(Math.round(comparison.qualifiedLeads.percent!)).toBe(-22)
  })

  it('identifies the weakest and strongest channels', () => {
    const comparison = compareWeeks(seed.weeks)!
    expect(comparison.worstChannel?.channel).toBe('Paid search')
    expect(comparison.worstChannel?.change.absolute).toBe(-4)
    expect(comparison.bestChannel?.channel).toBe('Organic')
    expect(comparison.bestChannel?.change.absolute).toBe(2)
  })
})

describe('breachedSla', () => {
  const now = new Date('2026-09-10T12:00:00Z')

  const withAnalysis = (overrides: Partial<Enquiry>, slaHours: number, receivedAt: string): Enquiry => ({
    ...seed.enquiries[0],
    receivedAt,
    status: 'analysed',
    // Only `slaHours` matters to breachedSla; the rest is irrelevant here.
    analysis: { slaHours } as EnquiryAnalysis,
    ...overrides,
  })

  it('ignores enquiries that have not been analysed', () => {
    expect(breachedSla([{ ...seed.enquiries[0], analysis: null }], now)).toHaveLength(0)
  })

  it('flags an enquiry past its response window', () => {
    const late = withAnalysis({}, 4, '2026-09-10T02:00:00Z')
    expect(breachedSla([late], now)).toHaveLength(1)
  })

  it('does not flag an enquiry still inside its window', () => {
    const fresh = withAnalysis({}, 4, '2026-09-10T11:00:00Z')
    expect(breachedSla([fresh], now)).toHaveLength(0)
  })

  it('ignores enquiries that have already been responded to', () => {
    const answered = withAnalysis({ status: 'responded' }, 1, '2026-09-09T00:00:00Z')
    expect(breachedSla([answered], now)).toHaveLength(0)
  })
})

describe('sortByPriority', () => {
  it('orders urgent first and low last', () => {
    const sorted = sortByPriority([
      { priority: 'low' as const },
      { priority: 'urgent' as const },
      { priority: 'medium' as const },
      { priority: 'high' as const },
    ])
    expect(sorted.map((item) => item.priority)).toEqual(['urgent', 'high', 'medium', 'low'])
  })

  it('does not mutate the input array', () => {
    const input = [{ priority: 'low' as const }, { priority: 'urgent' as const }]
    sortByPriority(input)
    expect(input[0].priority).toBe('low')
  })
})

describe('pipelineByStage', () => {
  it('returns every stage, including empty ones', () => {
    expect(pipelineByStage([]).map((row) => row.stage)).toEqual([
      'Discovery',
      'Proposal',
      'Negotiation',
      'Closing',
    ])
  })

  it('sums values within a stage', () => {
    const opportunities: Opportunity[] = [
      { ...seed.opportunities[0], stage: 'proposal', value: 1000 },
      { ...seed.opportunities[1], stage: 'proposal', value: 2500 },
    ]
    expect(pipelineByStage(opportunities).find((row) => row.stage === 'Proposal')?.value).toBe(3500)
  })
})

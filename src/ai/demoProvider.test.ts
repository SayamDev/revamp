import { describe, expect, it } from 'vitest'
import { DemoAIProvider } from './demoProvider'
import { extractJson } from './ollamaProvider'
import { createSeedData } from '@/data/seed'
import type { BusinessContext } from './types'

const seed = createSeedData(new Date('2026-09-10T12:00:00Z'))
const provider = new DemoAIProvider(0)
const context: BusinessContext = {
  weeks: seed.weeks,
  leads: seed.leads,
  opportunities: seed.opportunities,
  issues: seed.issues,
  tasks: seed.tasks,
  enquiries: seed.enquiries,
}

const [flagship, outage, billing] = seed.enquiries

describe('analyseEnquiry', () => {
  it('produces the expected commercial analysis for the flagship enquiry', async () => {
    const analysis = await provider.analyseEnquiry(flagship, context)
    expect(analysis.category).toBe('sales_enquiry')
    expect(analysis.priority).toBe('high')
    expect(analysis.slaHours).toBe(4)
    expect(analysis.extracted.employees).toBe(150)
    expect(analysis.extracted.service).toBe('Website redesign')
    expect(analysis.estimatedValue).not.toBeNull()
    expect(analysis.recommendedAction).toContain('4 hours')
  })

  it('treats a production outage from an existing customer as urgent', async () => {
    const analysis = await provider.analyseEnquiry(outage, context)
    expect(analysis.category).toBe('support_issue')
    expect(analysis.priority).toBe('urgent')
    expect(analysis.slaHours).toBe(1)
    expect(analysis.estimatedValue).toBeNull()
  })

  it('routes a billing query to the billing category', async () => {
    const analysis = await provider.analyseEnquiry(billing, context)
    expect(analysis.category).toBe('billing_question')
  })

  it('always explains itself', async () => {
    const analysis = await provider.analyseEnquiry(flagship, context)
    expect(analysis.reasoning.length).toBeGreaterThan(0)
    expect(analysis.confidence).toBeGreaterThan(0)
    expect(analysis.confidence).toBeLessThanOrEqual(1)
  })

  it('is deterministic for the same input', async () => {
    const first = await provider.analyseEnquiry(flagship, context)
    const second = await provider.analyseEnquiry(flagship, context)
    expect(second.category).toBe(first.category)
    expect(second.priority).toBe(first.priority)
    expect(second.estimatedValue).toEqual(first.estimatedValue)
  })
})

describe('generateResponse', () => {
  it('writes a consultative sales reply that uses the extracted detail', async () => {
    const analysis = await provider.analyseEnquiry(flagship, context)
    const draft = await provider.generateResponse(flagship, analysis)
    expect(draft.tone).toBe('consultative')
    expect(draft.body).toContain('Helen')
    expect(draft.body).toContain('October')
    expect(draft.body).toContain('Northwind Studio')
    expect(draft.approved).toBe(false)
    expect(draft.edited).toBe(false)
  })

  it('switches to an apologetic tone for support and billing', async () => {
    const supportAnalysis = await provider.analyseEnquiry(outage, context)
    expect((await provider.generateResponse(outage, supportAnalysis)).tone).toBe('apologetic')
  })
})

describe('generateBusinessBriefing', () => {
  it('returns the three executive sections and recommendations', async () => {
    const briefing = await provider.generateBusinessBriefing(context)
    expect(briefing.sections.map((section) => section.heading)).toEqual([
      'What changed',
      'What needs attention',
      'Opportunity',
    ])
    expect(briefing.headline).toContain('14%')
    expect(briefing.recommendations.length).toBeGreaterThan(0)
  })

  it('degrades gracefully when there is no weekly history', async () => {
    const briefing = await provider.generateBusinessBriefing({ ...context, weeks: [] })
    expect(briefing.sections[0].body).toContain('Not enough weekly history')
  })
})

describe('answerBusinessQuestion', () => {
  it('explains a revenue drop with evidence and a recommendation', async () => {
    const answer = await provider.answerBusinessQuestion('Why did sales drop this week?', context)
    expect(answer.unsupported).toBe(false)
    expect(answer.answer).toContain('decreased')
    expect(answer.answer).not.toContain('-14')
    expect(answer.driver).toContain('Paid search')
    expect(answer.evidence.length).toBeGreaterThanOrEqual(3)
    expect(answer.recommendation.length).toBeGreaterThan(0)
  })

  it('answers pipeline questions from the opportunity data', async () => {
    const answer = await provider.answerBusinessQuestion('What is in the pipeline?', context)
    expect(answer.unsupported).toBe(false)
    expect(answer.answer).toContain('31 open opportunities')
  })

  it('refuses to answer questions the data cannot support', async () => {
    const answer = await provider.answerBusinessQuestion('What will our share price be in 2030?', context)
    expect(answer.unsupported).toBe(true)
    expect(answer.evidence).toHaveLength(0)
    expect(answer.confidence).toBe(0)
  })

  it('says so when the history is too short rather than inventing a comparison', async () => {
    const answer = await provider.answerBusinessQuestion('Why did sales drop?', { ...context, weeks: [] })
    expect(answer.unsupported).toBe(true)
  })
})

describe('recommendActions', () => {
  it('ranks escalations and late-stage deals', async () => {
    const actions = await provider.recommendActions(context)
    expect(actions.length).toBeGreaterThan(0)
    expect(actions.length).toBeLessThanOrEqual(4)
    expect(actions.every((action) => action.title.length > 0 && action.rationale.length > 0)).toBe(true)
  })
})

describe('extractJson', () => {
  it('reads a bare JSON object', () => {
    expect(extractJson('{"answer":"ok"}')).toEqual({ answer: 'ok' })
  })

  it('reads JSON out of a fenced code block', () => {
    expect(extractJson('Sure!\n```json\n{"answer":"ok"}\n```')).toEqual({ answer: 'ok' })
  })

  it('throws when there is no JSON to read', () => {
    expect(() => extractJson('no json here')).toThrow()
  })
})

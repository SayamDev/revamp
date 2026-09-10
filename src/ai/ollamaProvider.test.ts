import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalAIProvider, quotesFigure, slaMentioned } from './ollamaProvider'
import { createSeedData } from '@/data/seed'
import type { BusinessContext } from './types'

const seed = createSeedData(new Date('2026-09-10T12:00:00Z'))
const context: BusinessContext = {
  weeks: seed.weeks,
  leads: seed.leads,
  opportunities: seed.opportunities,
  issues: seed.issues,
  tasks: seed.tasks,
  enquiries: seed.enquiries,
}
const flagship = seed.enquiries[0]

/** Stand in for Ollama, returning whatever the model is meant to have said. */
function mockModel(content: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ message: { content: JSON.stringify(content) } }),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('slaMentioned', () => {
  it('accepts hours written in either form', () => {
    expect(slaMentioned('Contact within 4 hours with a price.', 4)).toBe(true)
    expect(slaMentioned('Respond in 4h.', 4)).toBe(true)
  })

  it('rejects a different or absent timescale', () => {
    expect(slaMentioned('Reply by the end of the week.', 4)).toBe(false)
    expect(slaMentioned('Respond within 24 hours.', 4)).toBe(false)
  })
})

describe('quotesFigure', () => {
  it('matches the figure with or without thousands separators', () => {
    expect(quotesFigure('around £9,500 to start', 9500)).toBe(true)
    expect(quotesFigure('around 9500 to start', 9500)).toBe(true)
  })

  it('does not match a draft that omits it', () => {
    expect(quotesFigure('We will send a quote shortly.', 9500)).toBe(false)
  })
})

describe('LocalAIProvider.analyseEnquiry', () => {
  it('adopts the model wording when it respects the response window', async () => {
    mockModel({
      intent: 'Wants an indicative price for a redesign',
      recommendedAction: 'Send an indicative price within 4 hours and offer a scoping call.',
      summary: 'ABC Ltd want a redesign before October.',
    })

    const analysis = await new LocalAIProvider().analyseEnquiry(flagship, context)
    expect(analysis.intent).toBe('Wants an indicative price for a redesign')
    expect(analysis.recommendedAction).toContain('4 hours')
    expect(analysis.reasoning.at(-1)).toContain('Model summary')
  })

  it('keeps the rule-based action when the model proposes a looser timescale', async () => {
    mockModel({
      intent: 'Wants a quote',
      recommendedAction: 'Send a detailed proposal by the end of the week.',
      summary: 'Redesign enquiry.',
    })

    const analysis = await new LocalAIProvider().analyseEnquiry(flagship, context)
    expect(analysis.recommendedAction).not.toContain('end of the week')
    expect(analysis.recommendedAction).toContain('4 hours')
    expect(analysis.reasoning.some((line) => line.includes('did not respect'))).toBe(true)
  })

  it('never lets the model change the priority, value or extracted fields', async () => {
    mockModel({
      intent: 'Low priority junk',
      recommendedAction: 'Ignore within 4 hours.',
      summary: 'Nothing important.',
      priority: 'low',
      estimatedValue: { min: 1, max: 2 },
    })

    const analysis = await new LocalAIProvider().analyseEnquiry(flagship, context)
    expect(analysis.priority).toBe('high')
    expect(analysis.estimatedValue).toEqual({ min: 9500, max: 14_500 })
    expect(analysis.extracted.employees).toBe(150)
  })

  it('falls back to deterministic analysis when the model is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('connection refused')
    }))

    const analysis = await new LocalAIProvider().analyseEnquiry(flagship, context)
    expect(analysis.priority).toBe('high')
    expect(analysis.reasoning.at(-1)).toContain('Local model unavailable')
  })

  it('falls back when the model returns something that will not parse', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ message: { content: 'not json at all' } }) })),
    )

    const analysis = await new LocalAIProvider().analyseEnquiry(flagship, context)
    expect(analysis.reasoning.at(-1)).toContain('Local model unavailable')
  })
})

describe('LocalAIProvider.generateResponse', () => {
  const analysis = {
    categoryLabel: 'Sales enquiry',
    priority: 'high' as const,
    slaHours: 4,
    recommendedAction: 'Contact within 4 hours with an indicative price.',
    estimatedValue: { min: 9500, max: 14_500 },
    extracted: { company: 'ABC Ltd', employees: 150, service: 'Website redesign', deadline: 'October', budget: null, location: null },
    category: 'sales_enquiry' as const,
    intent: 'Wants a price',
    confidence: 0.9,
    reasoning: [],
    providerId: 'ollama',
    analysedAt: new Date().toISOString(),
  }

  it('uses the model draft when it quotes the calculated price band', async () => {
    mockModel({
      body: 'Hi Helen,\n\nProjects of this shape usually land between £9,500 and £14,500, confirmed after a scoping call.\n\nBest regards,\nAlex Whitmore',
    })

    const draft = await new LocalAIProvider().generateResponse(flagship, analysis)
    expect(draft.body).toContain('9,500')
    expect(draft.providerId).toBe('ollama')
  })

  it('rejects a commercial draft that drops the price band', async () => {
    mockModel({ body: 'Hi Helen,\n\nWe will send a full proposal by the end of the week.\n\nBest regards,\nAlex Whitmore' })

    const draft = await new LocalAIProvider().generateResponse(flagship, analysis)
    expect(draft.body).not.toContain('end of the week')
    expect(draft.body).toContain('9,500')
  })

  it('rejects a draft that is too short to be a reply', async () => {
    mockModel({ body: 'Thanks.' })

    const draft = await new LocalAIProvider().generateResponse(flagship, analysis)
    expect(draft.body.length).toBeGreaterThan(100)
  })
})

describe('LocalAIProvider.isAvailable', () => {
  it('is true when the Ollama tags endpoint responds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    expect(await new LocalAIProvider().isAvailable()).toBe(true)
  })

  it('is false when it does not', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('connection refused')
    }))
    expect(await new LocalAIProvider().isAvailable()).toBe(false)
  })
})

describe('LocalAIProvider keeps arithmetic away from the model', () => {
  it('answers business questions deterministically even when a model is running', async () => {
    mockModel({ answer: 'Sales fell because conversion increased.' })

    const answer = await new LocalAIProvider().answerBusinessQuestion('Why did sales drop this week?', context)
    expect(answer.answer).toContain('decreased 14%')
    expect(answer.answer).not.toContain('conversion increased')
    expect(answer.providerId).toBe('demo')
  })

  it('builds the briefing deterministically', async () => {
    mockModel({ headline: 'Everything is fine.' })

    const briefing = await new LocalAIProvider().generateBusinessBriefing(context)
    expect(briefing.headline).toContain('14%')
    expect(briefing.providerId).toBe('demo')
  })
})

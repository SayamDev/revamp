import { describe, expect, it } from 'vitest'
import {
  classify,
  confidenceFor,
  derivePriority,
  estimateValue,
  extractFields,
  scoreCategories,
  urgencyScore,
} from './rules'

const FLAGSHIP_ENQUIRY = `Website redesign — request for pricing
We're looking for help redesigning our website. We have around 150 employees and would ideally
like the work completed before October. Could someone get back to us with an idea of pricing?`

const OUTAGE = `URGENT — tracking portal is down for all depots
The tracking portal has been returning a 503 error since this morning. This is a production
outage and it is costing us money by the hour. Please escalate immediately.`

describe('classify', () => {
  it('identifies a sales enquiry from pricing and project language', () => {
    expect(classify(FLAGSHIP_ENQUIRY).category).toBe('sales_enquiry')
  })

  it('identifies a support issue from outage language', () => {
    expect(classify(OUTAGE).category).toBe('support_issue')
  })

  it('identifies a billing question', () => {
    expect(classify('We have been overcharged on invoice INV-2291, please send a refund.').category).toBe(
      'billing_question',
    )
  })

  it('identifies a partnership enquiry', () => {
    expect(classify('We would like to explore a white label partnership with you.').category).toBe(
      'partnership',
    )
  })

  it('falls back to general when nothing matches', () => {
    const result = classify('Hello, hope you are well. Speak soon.')
    expect(result.category).toBe('general')
    expect(result.score).toBe(0)
  })

  it('is case insensitive', () => {
    expect(classify('REQUEST FOR PRICING AND A PROPOSAL').category).toBe('sales_enquiry')
  })
})

describe('confidenceFor', () => {
  it('returns a low fixed score when no category matched', () => {
    expect(confidenceFor(scoreCategories('hello there'))).toBeLessThan(0.5)
  })

  it('rises with a clear winner and never exceeds the cap', () => {
    const confidence = confidenceFor(scoreCategories(FLAGSHIP_ENQUIRY))
    expect(confidence).toBeGreaterThan(0.6)
    expect(confidence).toBeLessThanOrEqual(0.97)
  })
})

describe('urgencyScore', () => {
  it('scores outage language highly', () => {
    expect(urgencyScore(OUTAGE).score).toBeGreaterThan(5)
  })

  it('scores calm language at zero', () => {
    expect(urgencyScore('No rush at all, whenever suits you.').score).toBe(0)
  })
})

describe('extractFields', () => {
  it('pulls company, headcount, service and deadline from the flagship enquiry', () => {
    const fields = extractFields(FLAGSHIP_ENQUIRY, 'ABC Ltd')
    expect(fields.employees).toBe(150)
    expect(fields.service).toBe('Website redesign')
    expect(fields.deadline).toBe('October')
    expect(fields.company).toBe('ABC Ltd')
  })

  it('reads a company name out of the message body when present', () => {
    expect(extractFields('We are Varndell Retail Ltd and we need a quote.').company).toBe(
      'Varndell Retail Ltd',
    )
  })

  it('handles thousands separators in headcount', () => {
    expect(extractFields('We have 1,180 employees across the group.').employees).toBe(1180)
  })

  it('returns nulls rather than guesses when fields are absent', () => {
    const fields = extractFields('Can you help?')
    expect(fields.employees).toBeNull()
    expect(fields.service).toBeNull()
    expect(fields.deadline).toBeNull()
  })

  it('recognises a quarter as a deadline', () => {
    expect(extractFields('We need this replatform live before Q4.').deadline).toBe('Q4')
  })
})

describe('estimateValue', () => {
  it('returns null for categories where a deal value is meaningless', () => {
    expect(estimateValue('support_issue', extractFields(OUTAGE))).toBeNull()
    expect(estimateValue('recruitment', extractFields('Please find my CV attached.'))).toBeNull()
  })

  it('scales the estimate with company size', () => {
    const small = estimateValue('sales_enquiry', extractFields('Website redesign for our 10 staff.'))
    const large = estimateValue('sales_enquiry', extractFields('Website redesign, we have 600 employees.'))
    expect(small).not.toBeNull()
    expect(large).not.toBeNull()
    expect(large!.max).toBeGreaterThan(small!.max)
  })

  it('produces a range where min is below max', () => {
    const range = estimateValue('sales_enquiry', extractFields(FLAGSHIP_ENQUIRY))!
    expect(range.min).toBeLessThan(range.max)
  })
})

describe('derivePriority', () => {
  const base = {
    category: 'sales_enquiry' as const,
    urgency: 0,
    estimatedValue: null,
    employees: null,
    isExistingCustomer: false,
    hasDeadline: false,
  }

  it('treats a quiet, low-value enquiry as low priority', () => {
    expect(derivePriority(base)).toBe('low')
  })

  it('raises a high-value enquiry with a deadline to high priority', () => {
    expect(
      derivePriority({
        ...base,
        estimatedValue: { min: 9500, max: 14_500 },
        employees: 150,
        hasDeadline: true,
      }),
    ).toBe('high')
  })

  it('treats an urgent production outage as urgent', () => {
    expect(
      derivePriority({
        ...base,
        category: 'support_issue',
        urgency: urgencyScore(OUTAGE).score,
        isExistingCustomer: true,
      }),
    ).toBe('urgent')
  })

  it('de-prioritises recruitment regardless of company size', () => {
    expect(derivePriority({ ...base, category: 'recruitment', employees: 900 })).toBe('low')
  })
})

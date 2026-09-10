/**
 * Deterministic analysis rules.
 *
 * These pure functions are the engine behind `DemoAIProvider`. They are kept
 * separate from the provider so they can be unit tested without any I/O, and
 * so a local LLM provider can reuse them as a fallback when a model response
 * fails to parse.
 */
import type {
  EnquiryCategory,
  ExtractedFields,
  Priority,
} from '@/types'

export interface CategoryScore {
  category: EnquiryCategory
  label: string
  score: number
  matched: string[]
}

const CATEGORY_RULES: {
  category: EnquiryCategory
  label: string
  keywords: [string, number][]
}[] = [
  {
    category: 'sales_enquiry',
    label: 'Sales enquiry',
    keywords: [
      ['quote', 3], ['pricing', 3], ['price', 2], ['cost', 2], ['proposal', 3],
      ['redesign', 2], ['new website', 3], ['project', 1], ['budget', 3],
      ['looking for help', 3], ['interested in', 2], ['engage', 2],
      ['statement of work', 3], ['rfp', 3], ['tender', 3], ['scope', 1],
    ],
  },
  {
    category: 'support_issue',
    label: 'Support issue',
    keywords: [
      ['broken', 3], ['not working', 4], ['error', 3], ['bug', 3], ['outage', 5],
      ['down', 3], ['cannot', 2], ["can't", 2], ['failing', 3], ['crash', 4],
      ['urgent', 2], ['issue', 2], ['fault', 3], ['timeout', 3], ['503', 4],
      ['data loss', 5], ['locked out', 4],
    ],
  },
  {
    category: 'billing_question',
    label: 'Billing question',
    keywords: [
      ['invoice', 4], ['billing', 4], ['overcharged', 5], ['refund', 4],
      ['payment', 3], ['vat', 3], ['receipt', 3], ['direct debit', 4],
      ['subscription renewal', 3], ['purchase order', 3],
    ],
  },
  {
    category: 'partnership',
    label: 'Partnership enquiry',
    keywords: [
      ['partnership', 5], ['partner', 3], ['reseller', 4], ['referral', 3],
      ['collaborate', 3], ['white label', 4], ['integration partner', 4],
    ],
  },
  {
    category: 'recruitment',
    label: 'Recruitment',
    keywords: [
      ['cv', 4], ['resume', 4], ['vacancy', 4], ['job', 3], ['role', 1],
      ['apply', 3], ['application for', 3], ['hiring', 3], ['portfolio', 2],
    ],
  },
]

const URGENCY_KEYWORDS: [string, number][] = [
  ['urgent', 3], ['asap', 3], ['immediately', 3], ['critical', 4],
  ['outage', 4], ['down', 2], ['deadline', 2], ['escalate', 3],
  ['losing', 2], ['blocked', 2], ['today', 2], ['emergency', 4],
  ['production', 2], ['data loss', 4],
]

const norm = (text: string) => text.toLowerCase().replace(/\s+/g, ' ')

/** Score every category and return them sorted best-first. */
export function scoreCategories(text: string): CategoryScore[] {
  const haystack = norm(text)
  const scores = CATEGORY_RULES.map(({ category, label, keywords }) => {
    const matched: string[] = []
    let score = 0
    for (const [word, weight] of keywords) {
      if (haystack.includes(word)) {
        matched.push(word)
        score += weight
      }
    }
    return { category, label, score, matched }
  })
  scores.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category))
  return scores
}

export function classify(text: string): CategoryScore {
  const [best] = scoreCategories(text)
  if (!best || best.score === 0) {
    return { category: 'general', label: 'General enquiry', score: 0, matched: [] }
  }
  return best
}

/**
 * Confidence is derived from how far the winning category is ahead of the
 * runner-up, plus how much evidence it found. Illustrative only — it is a
 * rule-based separation score, not a calibrated probability.
 */
export function confidenceFor(scores: CategoryScore[]): number {
  const [best, second] = scores
  if (!best || best.score === 0) return 0.42
  const margin = best.score - (second?.score ?? 0)
  const evidence = Math.min(best.matched.length / 4, 1)
  const separation = Math.min(margin / 8, 1)
  return Math.round(Math.min(0.55 + separation * 0.3 + evidence * 0.14, 0.97) * 100) / 100
}

export function urgencyScore(text: string): { score: number; matched: string[] } {
  const haystack = norm(text)
  const matched: string[] = []
  let score = 0
  for (const [word, weight] of URGENCY_KEYWORDS) {
    if (haystack.includes(word)) {
      matched.push(word)
      score += weight
    }
  }
  return { score, matched }
}

export interface PriorityInput {
  category: EnquiryCategory
  urgency: number
  estimatedValue: { min: number; max: number } | null
  employees: number | null
  isExistingCustomer: boolean
  /** A stated target date is itself a time pressure signal. */
  hasDeadline: boolean
}

/** Priority blends urgency signals, deal size and account status. */
export function derivePriority(input: PriorityInput): Priority {
  let points = input.urgency

  if (input.category === 'support_issue') points += 2
  if (input.category === 'billing_question') points += 1
  if (input.category === 'recruitment') points -= 2

  const value = input.estimatedValue?.max ?? 0
  if (value >= 25000) points += 4
  else if (value >= 10000) points += 3
  else if (value >= 4000) points += 1

  if ((input.employees ?? 0) >= 250) points += 2
  else if ((input.employees ?? 0) >= 100) points += 1

  if (input.isExistingCustomer) points += 1
  if (input.hasDeadline) points += 1

  if (points >= 9) return 'urgent'
  if (points >= 5) return 'high'
  if (points >= 2) return 'medium'
  return 'low'
}

export const SLA_HOURS: Record<Priority, number> = {
  urgent: 1,
  high: 4,
  medium: 24,
  low: 72,
}

const SERVICE_PATTERNS: [RegExp, string][] = [
  [/website redesign|redesign(ing)? (our|the|your)? ?website|site redesign/, 'Website redesign'],
  [/e-?commerce|online (shop|store)|checkout/, 'E-commerce build'],
  [/mobile app|ios app|android app/, 'Mobile application'],
  [/brand(ing)?|logo|identity/, 'Brand identity'],
  [/seo|search engine/, 'SEO engagement'],
  [/migration|migrate/, 'Platform migration'],
  [/support (contract|retainer)|maintenance/, 'Support retainer'],
  [/integration|api work/, 'Systems integration'],
]

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/** Pull structured fields out of free text. Returns null for absent fields. */
export function extractFields(text: string, fallbackCompany?: string): ExtractedFields {
  const haystack = norm(text)

  const employeeMatch =
    haystack.match(/(?:around |about |approximately |roughly |over |we have )?(\d[\d,]*)\s*(?:\+)?\s*(?:employees|staff|people|headcount|seats|users)/)
  const employees = employeeMatch ? Number(employeeMatch[1].replace(/,/g, '')) : null

  const budgetMatch = haystack.match(/(?:£|gbp\s?)([\d,]+)(?:\s*(?:k|,000))?(?:\s*(?:-|to|–)\s*(?:£|gbp\s?)?([\d,]+)k?)?/)
  const budget = budgetMatch ? budgetMatch[0].trim() : null

  let deadline: string | null = null
  const monthHit = MONTHS.find((m) => haystack.includes(m))
  if (monthHit) deadline = monthHit[0].toUpperCase() + monthHit.slice(1)
  const quarterMatch = haystack.match(/\bq([1-4])\b/)
  if (!deadline && quarterMatch) deadline = `Q${quarterMatch[1]}`
  if (!deadline && /(end of (the )?(year|month)|year[- ]end)/.test(haystack)) deadline = 'End of year'
  if (!deadline && /(asap|as soon as possible|immediately)/.test(haystack)) deadline = 'Immediate'

  let service: string | null = null
  for (const [pattern, label] of SERVICE_PATTERNS) {
    if (pattern.test(haystack)) {
      service = label
      break
    }
  }

  const companyMatch = text.match(/\b([A-Z][A-Za-z&.'-]*(?:\s+[A-Z][A-Za-z&.'-]*)*)\s+(Ltd|Limited|LLP|PLC|Group|Holdings|Partners)\b/)
  const company = companyMatch ? `${companyMatch[1]} ${companyMatch[2]}` : (fallbackCompany ?? null)

  const locationMatch = text.match(/\b(?:based in|offices in|located in)\s+([A-Z][A-Za-z\s]{2,20})/)
  const location = locationMatch ? locationMatch[1].trim() : null

  return { company, employees, service, deadline, budget, location }
}

const SERVICE_BASE_VALUE: Record<string, number> = {
  'Website redesign': 9000,
  'E-commerce build': 22000,
  'Mobile application': 30000,
  'Brand identity': 7000,
  'SEO engagement': 6000,
  'Platform migration': 18000,
  'Support retainer': 12000,
  'Systems integration': 14000,
}

/**
 * Estimate deal value from the requested service, scaled by company size.
 * Returns null for categories where a deal value is meaningless.
 */
export function estimateValue(
  category: EnquiryCategory,
  extracted: ExtractedFields,
): { min: number; max: number } | null {
  if (category !== 'sales_enquiry' && category !== 'partnership') return null

  const base = extracted.service ? SERVICE_BASE_VALUE[extracted.service] ?? 8000 : 8000
  const employees = extracted.employees ?? 40
  const sizeMultiplier =
    employees >= 500 ? 2.4 : employees >= 250 ? 1.9 : employees >= 100 ? 1.35 : employees >= 25 ? 1 : 0.7

  const midpoint = base * sizeMultiplier
  const round = (n: number) => Math.round(n / 500) * 500
  return { min: round(midpoint * 0.8), max: round(midpoint * 1.2) }
}

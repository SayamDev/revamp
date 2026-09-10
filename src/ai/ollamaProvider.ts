/**
 * LocalAIProvider — talks to an Ollama server on the user's own machine.
 *
 * Optional. Nothing in Relay depends on it: if the server is unreachable, or a
 * model returns something that will not parse, we fall back to the same
 * deterministic rules the demo provider uses and say so in the UI. This keeps
 * the public demo working with zero running cost while still exercising a real
 * model path locally.
 *
 * See README, "Optional: local AI".
 */
import type {
  AIProvider,
  AnalystAnswer,
  Briefing,
  BusinessContext,
  RecommendedAction,
} from './types'
import { DemoAIProvider } from './demoProvider'
import type { Enquiry, EnquiryAnalysis, ResponseDraft } from '@/types'
import { formatCurrency } from '@/lib/format'

const DEFAULT_HOST = 'http://localhost:11434'
const REQUEST_TIMEOUT_MS = 30_000

interface OllamaChatResponse {
  message?: { content?: string }
}

/** Pull the first JSON object out of a model response, tolerating code fences. */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object in model response')
  return JSON.parse(candidate.slice(start, end + 1))
}

/** True when the text states the response window, in hours or as "4h". */
export function slaMentioned(text: string, slaHours: number): boolean {
  return new RegExp(`\\b${slaHours}\\s*(h\\b|hours?\\b|hrs?\\b)`, 'i').test(text)
}

/** True when the text contains the figure, with or without thousands separators. */
export function quotesFigure(text: string, value: number): boolean {
  const plain = String(value)
  const grouped = value.toLocaleString('en-GB')
  return text.includes(plain) || text.includes(grouped)
}

export class LocalAIProvider implements AIProvider {
  readonly id = 'ollama'
  readonly label: string
  readonly mode = 'local' as const

  private readonly fallback = new DemoAIProvider(0)

  private readonly host: string
  private readonly model: string

  constructor(host: string = DEFAULT_HOST, model: string = 'llama3.2') {
    this.host = host
    this.model = model
    this.label = `Local AI (${model})`
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`, {
        signal: AbortSignal.timeout(2500),
      })
      return response.ok
    } catch {
      return false
    }
  }

  private async chat(system: string, user: string): Promise<string> {
    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Ollama responded ${response.status}`)
    const data = (await response.json()) as OllamaChatResponse
    const content = data.message?.content
    if (!content) throw new Error('Empty response from Ollama')
    return content
  }

  /**
   * The model refines the deterministic analysis rather than replacing it.
   * Numbers stay rule-derived; the model may improve intent and next action.
   */
  async analyseEnquiry(enquiry: Enquiry, context: BusinessContext): Promise<EnquiryAnalysis> {
    const baseline = await this.fallback.analyseEnquiry(enquiry, context)
    try {
      const raw = await this.chat(
        'You are an operations analyst. Reply with JSON only, using exactly these keys: intent (string, one sentence), recommendedAction (string, one sentence, imperative), summary (string, one sentence).',
        [
          `Subject: ${enquiry.subject}`,
          `From: ${enquiry.senderName} at ${enquiry.company}`,
          '',
          enquiry.body,
          '',
          `Rule-based classification: ${baseline.categoryLabel}, priority ${baseline.priority}.`,
          `The agreed response window for this priority is ${baseline.slaHours} hours.`,
          `recommendedAction MUST state that window as "${baseline.slaHours} hours". Do not propose any other timescale.`,
        ].join('\n'),
      )
      const parsed = extractJson(raw) as Record<string, unknown>
      const reasoning = [...baseline.reasoning]

      // The response window is a commitment the rules derived from priority.
      // A model is not allowed to quietly replace it with a looser one, so an
      // action that does not restate the window is rejected.
      const proposedAction = typeof parsed.recommendedAction === 'string' ? parsed.recommendedAction : null
      const respectsSla =
        proposedAction !== null && slaMentioned(proposedAction, baseline.slaHours)
      if (proposedAction !== null && !respectsSla) {
        reasoning.push(
          `Model proposed a next action that did not respect the ${baseline.slaHours}-hour response window, so the rule-based action was kept.`,
        )
      }

      reasoning.push(
        typeof parsed.summary === 'string' ? `Model summary: ${parsed.summary}` : 'Model returned no summary.',
      )

      return {
        ...baseline,
        intent: typeof parsed.intent === 'string' ? parsed.intent : baseline.intent,
        recommendedAction: respectsSla ? proposedAction : baseline.recommendedAction,
        reasoning,
        providerId: this.id,
      }
    } catch {
      return { ...baseline, reasoning: [...baseline.reasoning, 'Local model unavailable — deterministic analysis used.'] }
    }
  }

  async generateResponse(enquiry: Enquiry, analysis: EnquiryAnalysis): Promise<ResponseDraft> {
    const baseline = await this.fallback.generateResponse(enquiry, analysis)

    const facts = [
      `Classification: ${analysis.categoryLabel}`,
      `Priority: ${analysis.priority}, response window ${analysis.slaHours} hours`,
      `Agreed next action: ${analysis.recommendedAction}`,
      analysis.estimatedValue
        ? `Indicative price range: ${formatCurrency(analysis.estimatedValue.min)} to ${formatCurrency(analysis.estimatedValue.max)}, subject to a scoping call`
        : null,
      analysis.extracted.deadline ? `Customer's stated target: ${analysis.extracted.deadline}` : null,
      analysis.extracted.service ? `Requested service: ${analysis.extracted.service}` : null,
    ].filter((line): line is string => line !== null)

    try {
      const raw = await this.chat(
        'You draft business email replies for Northwind Studio, signed by Alex Whitmore. Reply with JSON only: { "body": string }. British English, plain and direct, no marketing language. You may only use the facts supplied. Never invent a price, a date, a deliverable or a commitment that is not in the facts.',
        [
          `Incoming enquiry from ${enquiry.senderName} (${enquiry.company}):`,
          enquiry.body,
          '',
          'Facts you may rely on:',
          ...facts.map((fact) => `- ${fact}`),
          '',
          analysis.estimatedValue
            ? `The reply MUST quote the indicative range ${formatCurrency(analysis.estimatedValue.min)} to ${formatCurrency(analysis.estimatedValue.max)}.`
            : 'Do not mention price.',
          'Draft a reply of at most 150 words in short paragraphs separated by blank lines. Sign off as Alex Whitmore, Northwind Studio.',
        ].join('\n'),
      )
      const parsed = extractJson(raw) as Record<string, unknown>
      if (typeof parsed.body !== 'string' || parsed.body.trim().length < 40) throw new Error('Draft too short')

      // A commercial reply that drops the calculated price band is worse than
      // the deterministic one, so it is rejected rather than shown.
      const body = parsed.body.trim()
      if (analysis.estimatedValue && !quotesFigure(body, analysis.estimatedValue.min)) {
        throw new Error('Draft omitted the indicative price range')
      }

      return { ...baseline, body, providerId: this.id }
    } catch {
      return baseline
    }
  }

  /**
   * The briefing and the analyst are deliberately NOT routed through the model.
   *
   * Both are arithmetic over the business data, and a small local model gets
   * that arithmetic wrong in ways that are hard to detect: in testing,
   * llama3.2 rewrote "revenue fell, driven by lead volume" into "driven by a
   * decrease in conversion rate, as the conversion rate increased" — a claim
   * that contradicted the evidence rendered directly beneath it.
   *
   * Numbers a leader will act on are worth more than fluent phrasing, so these
   * two stay deterministic in every mode. The engine label reports what
   * actually produced the answer rather than which provider was selected.
   */
  async generateBusinessBriefing(context: BusinessContext): Promise<Briefing> {
    return this.fallback.generateBusinessBriefing(context)
  }

  async answerBusinessQuestion(question: string, context: BusinessContext): Promise<AnalystAnswer> {
    return this.fallback.answerBusinessQuestion(question, context)
  }

  async recommendActions(context: BusinessContext): Promise<RecommendedAction[]> {
    return this.fallback.recommendActions(context)
  }
}

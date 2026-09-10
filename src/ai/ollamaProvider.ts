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
        `Subject: ${enquiry.subject}\nFrom: ${enquiry.senderName} at ${enquiry.company}\n\n${enquiry.body}\n\nRule-based classification: ${baseline.categoryLabel}, priority ${baseline.priority}.`,
      )
      const parsed = extractJson(raw) as Record<string, unknown>
      return {
        ...baseline,
        intent: typeof parsed.intent === 'string' ? parsed.intent : baseline.intent,
        recommendedAction:
          typeof parsed.recommendedAction === 'string' ? parsed.recommendedAction : baseline.recommendedAction,
        reasoning: [
          ...baseline.reasoning,
          typeof parsed.summary === 'string' ? `Model summary: ${parsed.summary}` : 'Model returned no summary.',
        ],
        providerId: this.id,
      }
    } catch {
      return { ...baseline, reasoning: [...baseline.reasoning, 'Local model unavailable — deterministic analysis used.'] }
    }
  }

  async generateResponse(enquiry: Enquiry, analysis: EnquiryAnalysis): Promise<ResponseDraft> {
    const baseline = await this.fallback.generateResponse(enquiry, analysis)
    try {
      const raw = await this.chat(
        'You draft business email replies for Northwind Studio, signed by Alex Whitmore. Reply with JSON only: { "body": string }. British English, no marketing language, no invented commitments, no invented prices.',
        `Incoming enquiry from ${enquiry.senderName} (${enquiry.company}):\n${enquiry.body}\n\nClassification: ${analysis.categoryLabel}. Priority: ${analysis.priority}. Recommended action: ${analysis.recommendedAction}.\nDraft a reply of at most 150 words.`,
      )
      const parsed = extractJson(raw) as Record<string, unknown>
      if (typeof parsed.body !== 'string' || parsed.body.trim().length < 40) throw new Error('Draft too short')
      return { ...baseline, body: parsed.body.trim(), providerId: this.id }
    } catch {
      return baseline
    }
  }

  async generateBusinessBriefing(context: BusinessContext): Promise<Briefing> {
    const baseline = await this.fallback.generateBusinessBriefing(context)
    return { ...baseline, providerId: this.id }
  }

  async answerBusinessQuestion(question: string, context: BusinessContext): Promise<AnalystAnswer> {
    const baseline = await this.fallback.answerBusinessQuestion(question, context)
    if (baseline.unsupported) return { ...baseline, providerId: this.id }
    try {
      const raw = await this.chat(
        'You are a business analyst. Reply with JSON only: { "answer": string }. Use only the figures supplied. Do not invent numbers. One or two sentences.',
        `Question: ${question}\n\nDerived figures:\n${baseline.evidence.map((item) => `- ${item.label}: ${item.value}`).join('\n')}\nHeadline: ${baseline.answer}`,
      )
      const parsed = extractJson(raw) as Record<string, unknown>
      return {
        ...baseline,
        answer: typeof parsed.answer === 'string' ? parsed.answer : baseline.answer,
        providerId: this.id,
      }
    } catch {
      return { ...baseline, providerId: this.id }
    }
  }

  async recommendActions(context: BusinessContext): Promise<RecommendedAction[]> {
    return this.fallback.recommendActions(context)
  }
}

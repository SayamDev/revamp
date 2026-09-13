import type {
  Enquiry,
  EnquiryAnalysis,
  Lead,
  Opportunity,
  ResponseDraft,
  SupportIssue,
  Task,
  WeeklyMetric,
} from '@/types'

/** Everything a provider is allowed to reason over. No hidden state. */
export interface BusinessContext {
  weeks: WeeklyMetric[]
  leads: Lead[]
  opportunities: Opportunity[]
  issues: SupportIssue[]
  tasks: Task[]
  enquiries: Enquiry[]
}

export interface BriefingSection {
  heading: string
  body: string
}

export interface Briefing {
  generatedAt: string
  providerId: string
  headline: string
  sections: BriefingSection[]
  recommendations: string[]
}

export interface EvidenceItem {
  label: string
  value: string
  /** Direction relative to the comparison period, where meaningful. */
  direction?: 'up' | 'down' | 'flat'
}

export interface AnalystAnswer {
  question: string
  answer: string
  driver: string | null
  evidence: EvidenceItem[]
  recommendation: string
  /** Illustrative rule-based score, not a calibrated probability. */
  confidence: number
  providerId: string
  answeredAt: string
  /** True when the question could not be matched to available demo data. */
  unsupported: boolean
}

export interface RecommendedAction {
  id: string
  title: string
  rationale: string
  priority: 'low' | 'medium' | 'high'
}

/**
 * The single seam between Revamp and any model.
 *
 * Everything above this interface is deterministic application logic; anything
 * below it may be a rules engine, a local model, or a hosted API. The UI never
 * imports a concrete provider.
 */
export interface AIProvider {
  readonly id: string
  readonly label: string
  /** Shown in the UI so users always know which engine produced an output. */
  readonly mode: 'demo' | 'local'
  isAvailable(): Promise<boolean>
  analyseEnquiry(enquiry: Enquiry, context: BusinessContext): Promise<EnquiryAnalysis>
  generateResponse(enquiry: Enquiry, analysis: EnquiryAnalysis): Promise<ResponseDraft>
  generateBusinessBriefing(context: BusinessContext): Promise<Briefing>
  answerBusinessQuestion(question: string, context: BusinessContext): Promise<AnalystAnswer>
  recommendActions(context: BusinessContext): Promise<RecommendedAction[]>
}

export class AIProviderError extends Error {
  readonly providerId: string

  constructor(message: string, providerId: string) {
    super(message)
    this.name = 'AIProviderError'
    this.providerId = providerId
  }
}

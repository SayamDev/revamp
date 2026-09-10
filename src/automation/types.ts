import type { AIProvider, Briefing, BusinessContext } from '@/ai/types'
import type {
  Activity,
  AutomationRunRecord,
  Enquiry,
  EnquiryAnalysis,
  ResponseDraft,
  SupportIssue,
  Task,
} from '@/types'

export type AutomationId = 'new_enquiry' | 'customer_complaint' | 'daily_briefing'

export interface AutomationStepDefinition {
  key: string
  name: string
  description: string
}

export interface AutomationDefinition {
  id: AutomationId
  name: string
  trigger: string
  triggerKind: 'event' | 'schedule'
  description: string
  steps: AutomationStepDefinition[]
}

export interface AutomationInput {
  enquiry?: Enquiry
  issue?: SupportIssue
}

/**
 * Automations never mutate state themselves. They emit effects, which the
 * store applies. That keeps the workflow engine testable and means an n8n run
 * and a local run produce exactly the same downstream behaviour.
 */
export type AutomationEffect =
  | { type: 'enquiry_analysed'; enquiryId: string; analysis: EnquiryAnalysis }
  | { type: 'draft_generated'; enquiryId: string; draft: ResponseDraft }
  | { type: 'enquiry_status'; enquiryId: string; status: Enquiry['status'] }
  | { type: 'task_created'; task: Task }
  | { type: 'issue_escalated'; issueId: string }
  | { type: 'briefing_generated'; briefing: Briefing }
  | { type: 'activity'; activity: Activity }

export interface AutomationResult {
  record: AutomationRunRecord
  effects: AutomationEffect[]
}

export interface AutomationAdapter {
  readonly id: 'demo' | 'n8n'
  readonly label: string
  isAvailable(): Promise<boolean>
  run(
    definition: AutomationDefinition,
    input: AutomationInput,
    deps: { provider: AIProvider; context: BusinessContext },
  ): Promise<AutomationResult>
}

export class AutomationError extends Error {
  readonly stepKey: string | undefined

  constructor(message: string, stepKey?: string) {
    super(message)
    this.name = 'AutomationError'
    this.stepKey = stepKey
  }
}

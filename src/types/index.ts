/**
 * Relay domain model.
 *
 * All data in the shipped demo is fictional. See `src/data/seed.ts`.
 */

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type EnquiryStatus = 'new' | 'analysed' | 'awaiting_approval' | 'responded' | 'archived'

export type EnquiryCategory =
  | 'sales_enquiry'
  | 'support_issue'
  | 'billing_question'
  | 'partnership'
  | 'recruitment'
  | 'general'

export type TaskStatus = 'open' | 'in_progress' | 'done'

export type ActivityKind =
  | 'enquiry_received'
  | 'ai_analysis'
  | 'ai_extraction'
  | 'task_created'
  | 'task_completed'
  | 'draft_generated'
  | 'approval_pending'
  | 'approval_granted'
  | 'approval_rejected'
  | 'automation_run'
  | 'issue_escalated'
  | 'system'

export interface Customer {
  id: string
  company: string
  contactName: string
  email: string
  industry: string
  employees: number
  since: string
  lifetimeValue: number
}

export interface Enquiry {
  id: string
  customerId: string | null
  senderName: string
  senderEmail: string
  company: string
  subject: string
  body: string
  receivedAt: string
  status: EnquiryStatus
  channel: 'email' | 'web_form' | 'phone'
  analysis: EnquiryAnalysis | null
  draft: ResponseDraft | null
}

/** Structured output of `AIProvider.analyseEnquiry`. */
export interface EnquiryAnalysis {
  category: EnquiryCategory
  categoryLabel: string
  intent: string
  priority: Priority
  /** Illustrative demo score, not a calibrated probability. See README. */
  confidence: number
  estimatedValue: { min: number; max: number } | null
  slaHours: number
  recommendedAction: string
  reasoning: string[]
  extracted: ExtractedFields
  providerId: string
  analysedAt: string
}

export interface ExtractedFields {
  company: string | null
  employees: number | null
  service: string | null
  deadline: string | null
  budget: string | null
  location: string | null
}

export interface ResponseDraft {
  body: string
  tone: 'professional' | 'apologetic' | 'consultative'
  generatedAt: string
  providerId: string
  approved: boolean
  edited: boolean
}

export interface Lead {
  id: string
  company: string
  contactName: string
  source: string
  channel: string
  value: number
  stage: 'new' | 'qualified' | 'proposal' | 'won' | 'lost'
  createdAt: string
}

export interface Opportunity {
  id: string
  company: string
  name: string
  value: number
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closing'
  probability: number
  owner: string
  closeDate: string
}

export interface SupportIssue {
  id: string
  customerId: string
  company: string
  title: string
  category: 'outage' | 'bug' | 'billing' | 'how_to' | 'data'
  priority: Priority
  status: 'open' | 'escalated' | 'resolved'
  openedAt: string
  resolvedAt: string | null
  firstResponseMinutes: number | null
}

export interface Task {
  id: string
  title: string
  detail: string
  priority: Priority
  assignee: string
  dueAt: string
  source: string
  status: TaskStatus
  linkedEnquiryId: string | null
  createdAt: string
  completedAt: string | null
}

export interface Activity {
  id: string
  at: string
  kind: ActivityKind
  actor: 'ai' | 'human' | 'automation' | 'system'
  message: string
  detail?: string
  entityId?: string
}

export interface WeeklyMetric {
  weekStart: string
  label: string
  leads: number
  qualifiedLeads: number
  won: number
  revenue: number
  issues: number
  automationRuns: number
  avgResponseMinutes: number
  channelBreakdown: Record<string, number>
}

export interface AutomationRunRecord {
  id: string
  automationId: string
  at: string
  status: 'success' | 'failed'
  adapter: 'demo' | 'n8n'
  steps: { name: string; status: 'success' | 'failed'; detail: string }[]
  durationMs: number
}

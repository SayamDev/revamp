/**
 * Local workflow engine. Runs the automation steps in-process using the
 * configured AI provider. This is the default adapter and the one the public
 * demo uses — no external services, no running cost.
 */
import type {
  AutomationAdapter,
  AutomationDefinition,
  AutomationEffect,
  AutomationInput,
  AutomationResult,
} from './types'
import { AutomationError } from './types'
import type { AIProvider, BusinessContext } from '@/ai/types'
import type { Activity, ActivityKind, AutomationRunRecord, Task } from '@/types'
import { createId } from '@/lib/id'
import { hoursFromNow } from '@/lib/time'
import { formatCurrencyRange } from '@/lib/format'

const activity = (kind: ActivityKind, message: string, extra: Partial<Activity> = {}): AutomationEffect => ({
  type: 'activity',
  activity: {
    id: createId('act'),
    at: new Date().toISOString(),
    kind,
    actor: 'ai',
    message,
    ...extra,
  },
})

const OWNER_BY_CATEGORY: Record<string, string> = {
  sales_enquiry: 'Priya Raman',
  support_issue: 'Tom Beckett',
  billing_question: 'Dana Fowler',
  partnership: 'Alex Whitmore',
  recruitment: 'Hiring inbox',
  general: 'Alex Whitmore',
}

export class DemoAutomationAdapter implements AutomationAdapter {
  readonly id = 'demo' as const
  readonly label = 'Local workflow engine'

  async isAvailable(): Promise<boolean> {
    return true
  }

  async run(
    definition: AutomationDefinition,
    input: AutomationInput,
    deps: { provider: AIProvider; context: BusinessContext },
  ): Promise<AutomationResult> {
    const startedAt = Date.now()
    const steps: AutomationRunRecord['steps'] = []
    const effects: AutomationEffect[] = []
    const ok = (name: string, detail: string) => steps.push({ name, status: 'success', detail })

    try {
      if (definition.id === 'new_enquiry') {
        const enquiry = input.enquiry
        if (!enquiry) throw new AutomationError('No enquiry supplied to the new-enquiry automation')

        const analysis = await deps.provider.analyseEnquiry(enquiry, deps.context)
        effects.push({ type: 'enquiry_analysed', enquiryId: enquiry.id, analysis })
        ok('Analyse with AI', `Classified as ${analysis.categoryLabel}`)
        effects.push(
          activity('ai_analysis', `AI classified enquiry from ${enquiry.company} as ${analysis.categoryLabel}`, {
            detail: analysis.intent,
            entityId: enquiry.id,
          }),
        )

        ok('Determine priority', `${analysis.priority.toUpperCase()} — respond within ${analysis.slaHours}h`)
        effects.push(
          activity('ai_analysis', `Priority set to ${analysis.priority.toUpperCase()}`, {
            detail: `Confidence ${Math.round(analysis.confidence * 100)}% (illustrative). ${analysis.reasoning[0] ?? ''}`,
            entityId: enquiry.id,
          }),
        )

        const extractedSummary = Object.entries(analysis.extracted)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
        ok('Extract customer information', extractedSummary || 'No structured fields found')
        effects.push(
          activity('ai_extraction', 'Customer information extracted', {
            detail: extractedSummary || 'No structured fields found in the message',
            entityId: enquiry.id,
          }),
        )

        const task: Task = {
          id: createId('task'),
          title: `Follow up with ${analysis.extracted.company ?? enquiry.company}`,
          detail: analysis.recommendedAction,
          priority: analysis.priority,
          assignee: OWNER_BY_CATEGORY[analysis.category] ?? 'Alex Whitmore',
          dueAt: hoursFromNow(analysis.slaHours),
          source: 'AI enquiry analysis',
          status: 'open',
          linkedEnquiryId: enquiry.id,
          createdAt: new Date().toISOString(),
          completedAt: null,
        }
        effects.push({ type: 'task_created', task })
        ok('Create follow-up task', `Assigned to ${task.assignee}, due in ${analysis.slaHours}h`)
        effects.push(
          activity('task_created', `Follow-up task created: ${task.title}`, {
            detail: `Assigned to ${task.assignee}${analysis.estimatedValue ? `. Estimated value ${formatCurrencyRange(analysis.estimatedValue)}` : ''}`,
            entityId: task.id,
          }),
        )

        const draft = await deps.provider.generateResponse(enquiry, analysis)
        effects.push({ type: 'draft_generated', enquiryId: enquiry.id, draft })
        ok('Generate response', `${draft.tone} draft, ${draft.body.split(/\s+/).length} words`)
        effects.push(
          activity('draft_generated', `Response draft generated for ${enquiry.company}`, {
            detail: `Tone: ${draft.tone}`,
            entityId: enquiry.id,
          }),
        )

        effects.push({ type: 'enquiry_status', enquiryId: enquiry.id, status: 'awaiting_approval' })
        effects.push(
          activity('approval_pending', 'Awaiting human approval', {
            actor: 'system',
            detail: 'No message is sent until a person approves the draft.',
            entityId: enquiry.id,
          }),
        )
        ok('Write activity log', `${effects.filter((e) => e.type === 'activity').length} entries recorded`)
      }

      if (definition.id === 'customer_complaint') {
        const issue = input.issue
        if (!issue) throw new AutomationError('No support issue supplied to the complaint automation')

        ok('Identify issue', `${issue.company}: ${issue.title}`)
        effects.push(
          activity('ai_analysis', `Complaint identified for ${issue.company}`, {
            detail: issue.title,
            entityId: issue.id,
          }),
        )

        const urgent = issue.priority === 'urgent' || issue.priority === 'high'
        ok('Determine urgency', `${issue.priority.toUpperCase()}${urgent ? ' — escalation required' : ''}`)
        ok('Classify category', issue.category.replace('_', ' '))

        const task: Task = {
          id: createId('task'),
          title: `${urgent ? 'Escalate' : 'Resolve'}: ${issue.title}`,
          detail: `${issue.company} — ${issue.category.replace('_', ' ')} issue raised ${new Date(issue.openedAt).toLocaleDateString('en-GB')}.`,
          priority: issue.priority,
          assignee: urgent ? 'Tom Beckett' : 'Support triage',
          dueAt: hoursFromNow(urgent ? 2 : 24),
          source: 'AI complaint analysis',
          status: 'open',
          linkedEnquiryId: null,
          createdAt: new Date().toISOString(),
          completedAt: null,
        }
        effects.push({ type: 'task_created', task })
        ok('Create escalation task', `Assigned to ${task.assignee}`)
        effects.push(
          activity('task_created', `Escalation task created: ${task.title}`, {
            detail: `Assigned to ${task.assignee}`,
            entityId: task.id,
          }),
        )

        if (urgent) {
          effects.push({ type: 'issue_escalated', issueId: issue.id })
          effects.push(
            activity('issue_escalated', `${issue.company} issue escalated`, {
              detail: `Priority ${issue.priority.toUpperCase()}`,
              entityId: issue.id,
            }),
          )
        }

        const recommendation = urgent
          ? `Call the ${issue.company} account owner today and confirm a fix window in writing.`
          : `Acknowledge ${issue.company} within 24 hours and add the issue to the next triage review.`
        ok('Recommend action', recommendation)
        effects.push(activity('ai_analysis', 'Recommended action produced', { detail: recommendation, entityId: issue.id }))
      }

      if (definition.id === 'daily_briefing') {
        ok('Analyse business activity', `${deps.context.weeks.length} weeks of data compared`)
        ok('Identify important changes', 'Channel and stage movements ranked')
        const briefing = await deps.provider.generateBusinessBriefing(deps.context)
        effects.push({ type: 'briefing_generated', briefing })
        ok('Generate executive summary', briefing.headline)
        ok('Surface recommendations', `${briefing.recommendations.length} recommendations`)
        effects.push(
          activity('automation_run', 'Daily briefing generated', {
            actor: 'automation',
            detail: briefing.headline,
          }),
        )
      }

      return {
        record: {
          id: createId('run'),
          automationId: definition.id,
          at: new Date().toISOString(),
          status: 'success',
          adapter: this.id,
          steps,
          durationMs: Date.now() - startedAt,
        },
        effects,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown automation failure'
      steps.push({ name: 'Workflow', status: 'failed', detail: message })
      return {
        record: {
          id: createId('run'),
          automationId: definition.id,
          at: new Date().toISOString(),
          status: 'failed',
          adapter: this.id,
          steps,
          durationMs: Date.now() - startedAt,
        },
        effects,
      }
    }
  }
}

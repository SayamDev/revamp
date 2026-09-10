import type { AutomationDefinition, AutomationId } from './types'

export const AUTOMATIONS: Record<AutomationId, AutomationDefinition> = {
  new_enquiry: {
    id: 'new_enquiry',
    name: 'New enquiry',
    trigger: 'New customer enquiry received',
    triggerKind: 'event',
    description:
      'Analyses an inbound enquiry, sets priority, extracts the commercial detail, opens a follow-up task and drafts a reply for human approval.',
    steps: [
      { key: 'analyse', name: 'Analyse with AI', description: 'Classify intent and category from the message text' },
      { key: 'priority', name: 'Determine priority', description: 'Blend urgency language, deal size and account status' },
      { key: 'extract', name: 'Extract customer information', description: 'Pull company, size, service, deadline and budget' },
      { key: 'task', name: 'Create follow-up task', description: 'Open an owned task with a due date from the SLA' },
      { key: 'draft', name: 'Generate response', description: 'Draft a reply in the right tone for the category' },
      { key: 'log', name: 'Write activity log', description: 'Record every step in the audit trail' },
    ],
  },
  customer_complaint: {
    id: 'customer_complaint',
    name: 'Customer complaint',
    trigger: 'New support complaint logged',
    triggerKind: 'event',
    description:
      'Identifies the issue, sets urgency, categorises it, raises an escalation task and recommends the next action.',
    steps: [
      { key: 'identify', name: 'Identify issue', description: 'Read the reported problem and affected account' },
      { key: 'urgency', name: 'Determine urgency', description: 'Score severity against impact and account value' },
      { key: 'categorise', name: 'Classify category', description: 'Route to outage, bug, billing, data or how-to' },
      { key: 'escalate', name: 'Create escalation task', description: 'Assign to the right owner with a due time' },
      { key: 'recommend', name: 'Recommend action', description: 'Propose the next step for the account owner' },
    ],
  },
  daily_briefing: {
    id: 'daily_briefing',
    name: 'Daily CEO briefing',
    trigger: 'Every weekday at 07:30',
    triggerKind: 'schedule',
    description:
      'Analyses the week against the last, surfaces what needs attention and produces a short executive summary with recommendations.',
    steps: [
      { key: 'gather', name: 'Analyse business activity', description: 'Compare this week with the previous week' },
      { key: 'changes', name: 'Identify important changes', description: 'Find the largest movements by channel and stage' },
      { key: 'summary', name: 'Generate executive summary', description: 'Write the briefing in plain language' },
      { key: 'recommend', name: 'Surface recommendations', description: 'Rank the actions worth taking today' },
    ],
  },
}

export const AUTOMATION_LIST = Object.values(AUTOMATIONS)

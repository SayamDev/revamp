import { describe, expect, it } from 'vitest'
import { DemoAutomationAdapter } from './demoAdapter'
import { AUTOMATIONS } from './definitions'
import { AutomationService } from './AutomationService'
import type { AutomationAdapter } from './types'
import { DemoAIProvider } from '@/ai/demoProvider'
import { createSeedData } from '@/data/seed'
import type { BusinessContext } from '@/ai/types'

const seed = createSeedData(new Date('2026-09-10T12:00:00Z'))
const provider = new DemoAIProvider(0)
const context: BusinessContext = {
  weeks: seed.weeks,
  leads: seed.leads,
  opportunities: seed.opportunities,
  issues: seed.issues,
  tasks: seed.tasks,
  enquiries: seed.enquiries,
}
const deps = { provider, context }

const flagship = seed.enquiries[0]
const outage = seed.issues[0]

describe('new enquiry automation', () => {
  it('runs every step and reports success', async () => {
    const result = await new DemoAutomationAdapter().run(AUTOMATIONS.new_enquiry, { enquiry: flagship }, deps)
    expect(result.record.status).toBe('success')
    expect(result.record.steps).toHaveLength(AUTOMATIONS.new_enquiry.steps.length)
    expect(result.record.steps.every((step) => step.status === 'success')).toBe(true)
  })

  it('emits an analysis, a task, a draft and an approval hold', async () => {
    const { effects } = await new DemoAutomationAdapter().run(
      AUTOMATIONS.new_enquiry,
      { enquiry: flagship },
      deps,
    )
    const types = effects.map((effect) => effect.type)
    expect(types).toContain('enquiry_analysed')
    expect(types).toContain('task_created')
    expect(types).toContain('draft_generated')
    expect(effects).toContainEqual(
      expect.objectContaining({ type: 'enquiry_status', status: 'awaiting_approval' }),
    )
  })

  it('creates a follow-up task owned by sales with an SLA-derived due date', async () => {
    const { effects } = await new DemoAutomationAdapter().run(
      AUTOMATIONS.new_enquiry,
      { enquiry: flagship },
      deps,
    )
    const taskEffect = effects.find((effect) => effect.type === 'task_created')
    expect(taskEffect).toBeDefined()
    if (taskEffect?.type !== 'task_created') throw new Error('expected a task effect')
    expect(taskEffect.task.title).toContain('ABC Ltd')
    expect(taskEffect.task.assignee).toBe('Priya Raman')
    expect(taskEffect.task.source).toBe('AI enquiry analysis')
    expect(taskEffect.task.status).toBe('open')
    expect(new Date(taskEffect.task.dueAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('never marks a draft as approved on its own', async () => {
    const { effects } = await new DemoAutomationAdapter().run(
      AUTOMATIONS.new_enquiry,
      { enquiry: flagship },
      deps,
    )
    const draft = effects.find((effect) => effect.type === 'draft_generated')
    if (draft?.type !== 'draft_generated') throw new Error('expected a draft effect')
    expect(draft.draft.approved).toBe(false)
  })

  it('writes an audit entry for every meaningful step', async () => {
    const { effects } = await new DemoAutomationAdapter().run(
      AUTOMATIONS.new_enquiry,
      { enquiry: flagship },
      deps,
    )
    const activities = effects.filter((effect) => effect.type === 'activity')
    expect(activities.length).toBeGreaterThanOrEqual(5)
  })

  it('fails cleanly with no side effects when the trigger payload is missing', async () => {
    const result = await new DemoAutomationAdapter().run(AUTOMATIONS.new_enquiry, {}, deps)
    expect(result.record.status).toBe('failed')
    expect(result.effects).toHaveLength(0)
  })
})

describe('customer complaint automation', () => {
  it('escalates an urgent issue and opens an escalation task', async () => {
    const { effects, record } = await new DemoAutomationAdapter().run(
      AUTOMATIONS.customer_complaint,
      { issue: outage },
      deps,
    )
    expect(record.status).toBe('success')
    expect(effects.map((effect) => effect.type)).toContain('issue_escalated')
    const task = effects.find((effect) => effect.type === 'task_created')
    if (task?.type !== 'task_created') throw new Error('expected a task effect')
    expect(task.task.title).toMatch(/^Escalate/)
    expect(task.task.priority).toBe('urgent')
  })

  it('does not escalate a low priority issue', async () => {
    const lowIssue = { ...outage, priority: 'low' as const }
    const { effects } = await new DemoAutomationAdapter().run(
      AUTOMATIONS.customer_complaint,
      { issue: lowIssue },
      deps,
    )
    expect(effects.map((effect) => effect.type)).not.toContain('issue_escalated')
  })
})

describe('daily briefing automation', () => {
  it('produces a briefing with recommendations', async () => {
    const { effects } = await new DemoAutomationAdapter().run(AUTOMATIONS.daily_briefing, {}, deps)
    const briefing = effects.find((effect) => effect.type === 'briefing_generated')
    if (briefing?.type !== 'briefing_generated') throw new Error('expected a briefing effect')
    expect(briefing.briefing.sections).toHaveLength(3)
    expect(briefing.briefing.recommendations.length).toBeGreaterThan(0)
  })
})

describe('AutomationService adapter selection', () => {
  it('uses the local engine when no remote adapter is configured', async () => {
    const outcome = await new AutomationService(null).run('daily_briefing', {}, deps)
    expect(outcome.adapterUsed).toBe('demo')
    expect(outcome.fellBack).toBe(false)
  })

  it('falls back to the local engine when the remote adapter throws', async () => {
    const brokenRemote: AutomationAdapter = {
      id: 'n8n',
      label: 'broken n8n',
      isAvailable: async () => true,
      run: async () => {
        throw new Error('n8n responded 500')
      },
    }
    const outcome = await new AutomationService(brokenRemote).run('daily_briefing', {}, deps)
    expect(outcome.adapterUsed).toBe('demo')
    expect(outcome.fellBack).toBe(true)
    expect(outcome.record.status).toBe('success')
  })

  it('skips the remote adapter entirely when it is unreachable', async () => {
    const offlineRemote: AutomationAdapter = {
      id: 'n8n',
      label: 'offline n8n',
      isAvailable: async () => false,
      run: async () => {
        throw new Error('should not be called')
      },
    }
    const outcome = await new AutomationService(offlineRemote).run('daily_briefing', {}, deps)
    expect(outcome.adapterUsed).toBe('demo')
    expect(outcome.fellBack).toBe(false)
  })
})

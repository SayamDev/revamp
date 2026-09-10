import { describe, expect, it } from 'vitest'
import { useRelayStore } from './useRelayStore'

const store = () => useRelayStore.getState()

describe('enquiry workflow', () => {
  it('analyses an enquiry, opens a task, drafts a reply and waits for approval', async () => {
    await store().analyseEnquiry('enq_1')

    const enquiry = store().enquiries.find((item) => item.id === 'enq_1')!
    expect(enquiry.analysis?.category).toBe('sales_enquiry')
    expect(enquiry.analysis?.priority).toBe('high')
    expect(enquiry.draft).not.toBeNull()
    expect(enquiry.draft?.approved).toBe(false)
    expect(enquiry.status).toBe('awaiting_approval')

    const task = store().tasks.find((item) => item.linkedEnquiryId === 'enq_1')
    expect(task?.status).toBe('open')
    expect(task?.source).toBe('AI enquiry analysis')
  })

  it('records an automation run with per-step detail', async () => {
    await store().analyseEnquiry('enq_1')
    const run = store().runs[0]
    expect(run.automationId).toBe('new_enquiry')
    expect(run.status).toBe('success')
    expect(run.adapter).toBe('demo')
    expect(run.steps).toHaveLength(6)
  })

  it('marks the draft as edited when a human changes it', async () => {
    await store().analyseEnquiry('enq_1')
    store().updateDraft('enq_1', 'Hi Helen, rewritten by a person.')

    const draft = store().enquiries.find((item) => item.id === 'enq_1')!.draft!
    expect(draft.body).toBe('Hi Helen, rewritten by a person.')
    expect(draft.edited).toBe(true)
  })

  it('closes the linked task and logs the decision on approval', async () => {
    await store().analyseEnquiry('enq_1')
    store().approveDraft('enq_1')

    const enquiry = store().enquiries.find((item) => item.id === 'enq_1')!
    expect(enquiry.status).toBe('responded')
    expect(enquiry.draft?.approved).toBe(true)
    expect(store().tasks.find((task) => task.linkedEnquiryId === 'enq_1')?.status).toBe('done')

    const kinds = store().activities.slice(0, 2).map((activity) => activity.kind)
    expect(kinds).toContain('approval_granted')
  })

  it('returns the enquiry to the queue and discards the draft on rejection', async () => {
    await store().analyseEnquiry('enq_1')
    store().rejectDraft('enq_1')

    const enquiry = store().enquiries.find((item) => item.id === 'enq_1')!
    expect(enquiry.draft).toBeNull()
    expect(enquiry.status).toBe('analysed')
    expect(store().activities[0].kind).toBe('approval_rejected')
  })

  it('ignores actions against an unknown enquiry instead of throwing', async () => {
    await expect(store().analyseEnquiry('does_not_exist')).resolves.toBeUndefined()
    expect(() => store().approveDraft('does_not_exist')).not.toThrow()
  })
})

describe('analyst', () => {
  it('keeps answers in history, newest first', async () => {
    await store().askAnalyst('Why did sales drop this week?')
    await store().askAnalyst('How many support issues are open?')
    expect(store().answers).toHaveLength(2)
    expect(store().answers[0].question).toBe('How many support issues are open?')
  })

  it('logs every question in the audit trail', async () => {
    await store().askAnalyst('Why did sales drop this week?')
    expect(store().activities[0].message).toContain('Business question answered')
  })
})

describe('resetDemoData', () => {
  it('restores the starting state after a demo has been run', async () => {
    await store().analyseEnquiry('enq_1')
    store().completeTask('task_1')
    expect(store().runs).toHaveLength(1)

    store().resetDemoData()

    expect(store().runs).toHaveLength(0)
    expect(store().answers).toHaveLength(0)
    expect(store().briefing).toBeNull()
    expect(store().enquiries.every((enquiry) => enquiry.analysis === null)).toBe(true)
    expect(store().tasks.find((task) => task.id === 'task_1')?.status).toBe('open')
  })
})

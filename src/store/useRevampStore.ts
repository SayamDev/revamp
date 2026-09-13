/**
 * Single source of truth for the demo business.
 *
 * State is persisted to localStorage so a demo survives a refresh, and can be
 * reset at any time from the header. Nothing here talks to a network service:
 * the AI and automation seams are injected as interfaces, which is what lets
 * the same UI run against the rules engine, a local model, or n8n.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnalystAnswer, Briefing, BusinessContext } from '@/ai/types'
import { createProvider, defaultProviderKey, type ProviderKey } from '@/ai'
import { createAutomationService } from '@/automation/AutomationService'
import type { AutomationEffect, AutomationId, AutomationInput } from '@/automation/types'
import { createSeedData } from '@/data/seed'
import { createId } from '@/lib/id'
import type {
  Activity,
  ActivityKind,
  AutomationRunRecord,
  Customer,
  Enquiry,
  Lead,
  Opportunity,
  SupportIssue,
  Task,
  WeeklyMetric,
} from '@/types'

const automationService = createAutomationService()

export interface AsyncState {
  status: 'idle' | 'loading' | 'error'
  error: string | null
}

const idle: AsyncState = { status: 'idle', error: null }

interface RevampState {
  // Data
  customers: Customer[]
  enquiries: Enquiry[]
  leads: Lead[]
  opportunities: Opportunity[]
  issues: SupportIssue[]
  tasks: Task[]
  activities: Activity[]
  weeks: WeeklyMetric[]
  runs: AutomationRunRecord[]
  briefing: Briefing | null
  answers: AnalystAnswer[]

  // Settings
  providerKey: ProviderKey
  /** True once a person has picked an engine, which then wins over the env default. */
  providerChosenByUser: boolean
  localProviderAvailable: boolean | null
  signedIn: boolean
  /** Hides the first-run walkthrough. Restored by resetDemoData for repeat demos. */
  guideDismissed: boolean
  seededAt: string

  // Async flags, keyed so several panels can load independently
  pending: Record<string, AsyncState>

  // Actions
  signIn: () => void
  signOut: () => void
  dismissGuide: () => void
  resetDemoData: () => void
  setProviderKey: (key: ProviderKey) => Promise<void>
  checkLocalProvider: () => Promise<void>
  runAutomation: (id: AutomationId, input: AutomationInput) => Promise<void>
  analyseEnquiry: (enquiryId: string) => Promise<void>
  regenerateDraft: (enquiryId: string) => Promise<void>
  updateDraft: (enquiryId: string, body: string) => void
  approveDraft: (enquiryId: string) => void
  rejectDraft: (enquiryId: string) => void
  completeTask: (taskId: string) => void
  reopenTask: (taskId: string) => void
  generateBriefing: () => Promise<void>
  askAnalyst: (question: string) => Promise<void>
  clearAnswers: () => void
}

const seedState = () => {
  const seed = createSeedData()
  return {
    ...seed,
    runs: [] as AutomationRunRecord[],
    briefing: null,
    answers: [] as AnalystAnswer[],
    seededAt: new Date().toISOString(),
  }
}

const logActivity = (
  activities: Activity[],
  kind: ActivityKind,
  actor: Activity['actor'],
  message: string,
  detail?: string,
  entityId?: string,
): Activity[] => [
  { id: createId('act'), at: new Date().toISOString(), kind, actor, message, detail, entityId },
  ...activities,
]

export const useRevampStore = create<RevampState>()(
  persist(
    (set, get) => {
      const provider = () => createProvider(get().providerKey)

      const context = (): BusinessContext => {
        const state = get()
        return {
          weeks: state.weeks,
          leads: state.leads,
          opportunities: state.opportunities,
          issues: state.issues,
          tasks: state.tasks,
          enquiries: state.enquiries,
        }
      }

      const setPending = (key: string, value: AsyncState) =>
        set((state) => ({ pending: { ...state.pending, [key]: value } }))

      const applyEffects = (effects: AutomationEffect[]) => {
        set((state) => {
          let { enquiries, tasks, activities, issues, briefing } = state
          for (const effect of effects) {
            switch (effect.type) {
              case 'enquiry_analysed':
                enquiries = enquiries.map((e) =>
                  e.id === effect.enquiryId ? { ...e, analysis: effect.analysis, status: 'analysed' } : e,
                )
                break
              case 'draft_generated':
                enquiries = enquiries.map((e) =>
                  e.id === effect.enquiryId ? { ...e, draft: effect.draft } : e,
                )
                break
              case 'enquiry_status':
                enquiries = enquiries.map((e) =>
                  e.id === effect.enquiryId ? { ...e, status: effect.status } : e,
                )
                break
              case 'task_created':
                tasks = [effect.task, ...tasks]
                break
              case 'issue_escalated':
                issues = issues.map((issue) =>
                  issue.id === effect.issueId ? { ...issue, status: 'escalated' } : issue,
                )
                break
              case 'briefing_generated':
                briefing = effect.briefing
                break
              case 'activity':
                activities = [effect.activity, ...activities]
                break
            }
          }
          return { enquiries, tasks, activities, issues, briefing }
        })
      }

      return {
        ...seedState(),
        providerKey: defaultProviderKey,
        providerChosenByUser: false,
        localProviderAvailable: null,
        signedIn: false,
        guideDismissed: false,
        pending: {},

        signIn: () => {
          set((state) => ({
            signedIn: true,
            activities: logActivity(state.activities, 'system', 'human', 'Demo session started'),
          }))
        },

        signOut: () => set({ signedIn: false }),

        dismissGuide: () => set({ guideDismissed: true }),

        resetDemoData: () => {
          // The walkthrough comes back too, so the next demo starts the same
          // way as the first one.
          set({ ...seedState(), pending: {}, guideDismissed: false })
        },

        setProviderKey: async (key) => {
          set({ providerKey: key, providerChosenByUser: true })
          const available = await createProvider(key).isAvailable()
          set((state) => ({
            localProviderAvailable: key === 'ollama' ? available : state.localProviderAvailable,
            activities: logActivity(
              state.activities,
              'system',
              'human',
              `AI provider switched to ${key === 'ollama' ? 'Local AI (Ollama)' : 'Demo AI'}`,
              key === 'ollama' && !available
                ? 'Ollama was not reachable — Revamp will fall back to deterministic analysis.'
                : undefined,
            ),
          }))
        },

        checkLocalProvider: async () => {
          const available = await createProvider('ollama').isAvailable()
          set({ localProviderAvailable: available })
        },

        runAutomation: async (id, input) => {
          setPending(`automation:${id}`, { status: 'loading', error: null })
          try {
            const outcome = await automationService.run(id, input, {
              provider: provider(),
              context: context(),
            })
            applyEffects(outcome.effects)
            set((state) => ({ runs: [outcome.record, ...state.runs] }))
            if (outcome.record.status === 'failed') {
              const detail = outcome.record.steps.find((step) => step.status === 'failed')?.detail
              setPending(`automation:${id}`, { status: 'error', error: detail ?? 'The workflow did not complete.' })
              return
            }
            if (outcome.fellBack) {
              set((state) => ({
                activities: logActivity(
                  state.activities,
                  'system',
                  'system',
                  'n8n was unavailable — the local workflow engine ran instead',
                ),
              }))
            }
            setPending(`automation:${id}`, idle)
          } catch (error) {
            setPending(`automation:${id}`, {
              status: 'error',
              error: error instanceof Error ? error.message : 'The workflow did not complete.',
            })
          }
        },

        analyseEnquiry: async (enquiryId) => {
          const enquiry = get().enquiries.find((e) => e.id === enquiryId)
          if (!enquiry) return
          setPending(`enquiry:${enquiryId}`, { status: 'loading', error: null })
          set((state) => ({
            activities: logActivity(
              state.activities,
              'enquiry_received',
              'system',
              `Enquiry from ${enquiry.company} entered the workflow`,
              enquiry.subject,
              enquiry.id,
            ),
          }))
          try {
            await get().runAutomation('new_enquiry', { enquiry })
            const failure = get().pending['automation:new_enquiry']
            if (failure?.status === 'error') {
              setPending(`enquiry:${enquiryId}`, failure)
              return
            }
            setPending(`enquiry:${enquiryId}`, idle)
          } catch (error) {
            setPending(`enquiry:${enquiryId}`, {
              status: 'error',
              error: error instanceof Error ? error.message : 'AI analysis failed.',
            })
          }
        },

        regenerateDraft: async (enquiryId) => {
          const enquiry = get().enquiries.find((e) => e.id === enquiryId)
          if (!enquiry?.analysis) return
          setPending(`draft:${enquiryId}`, { status: 'loading', error: null })
          try {
            const draft = await provider().generateResponse(enquiry, enquiry.analysis)
            set((state) => ({
              enquiries: state.enquiries.map((e) => (e.id === enquiryId ? { ...e, draft } : e)),
              activities: logActivity(
                state.activities,
                'draft_generated',
                'ai',
                `Response draft regenerated for ${enquiry.company}`,
                `Tone: ${draft.tone}`,
                enquiryId,
              ),
            }))
            setPending(`draft:${enquiryId}`, idle)
          } catch (error) {
            setPending(`draft:${enquiryId}`, {
              status: 'error',
              error: error instanceof Error ? error.message : 'Could not generate a draft.',
            })
          }
        },

        updateDraft: (enquiryId, body) => {
          set((state) => ({
            enquiries: state.enquiries.map((e) =>
              e.id === enquiryId && e.draft ? { ...e, draft: { ...e.draft, body, edited: true } } : e,
            ),
          }))
        },

        approveDraft: (enquiryId) => {
          const enquiry = get().enquiries.find((e) => e.id === enquiryId)
          if (!enquiry?.draft) return
          set((state) => ({
            enquiries: state.enquiries.map((e) =>
              e.id === enquiryId
                ? { ...e, status: 'responded', draft: e.draft ? { ...e.draft, approved: true } : null }
                : e,
            ),
            tasks: state.tasks.map((task) =>
              task.linkedEnquiryId === enquiryId && task.status !== 'done'
                ? { ...task, status: 'done', completedAt: new Date().toISOString() }
                : task,
            ),
            activities: logActivity(
              logActivity(
                state.activities,
                'approval_granted',
                'human',
                `Response to ${enquiry.company} approved`,
                enquiry.draft?.edited ? 'Draft was edited before approval.' : 'Draft approved as generated.',
                enquiryId,
              ),
              'system',
              'system',
              'Demo environment — no message was sent to a real recipient',
              undefined,
              enquiryId,
            ),
          }))
        },

        rejectDraft: (enquiryId) => {
          const enquiry = get().enquiries.find((e) => e.id === enquiryId)
          if (!enquiry) return
          set((state) => ({
            enquiries: state.enquiries.map((e) =>
              e.id === enquiryId ? { ...e, status: 'analysed', draft: null } : e,
            ),
            activities: logActivity(
              state.activities,
              'approval_rejected',
              'human',
              `Response draft for ${enquiry.company} rejected`,
              'The draft was discarded and the enquiry returned to the queue.',
              enquiryId,
            ),
          }))
        },

        completeTask: (taskId) => {
          const task = get().tasks.find((t) => t.id === taskId)
          if (!task) return
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId ? { ...t, status: 'done', completedAt: new Date().toISOString() } : t,
            ),
            activities: logActivity(
              state.activities,
              'task_completed',
              'human',
              `Task completed: ${task.title}`,
              `Closed by ${task.assignee}`,
              taskId,
            ),
          }))
        },

        reopenTask: (taskId) => {
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId ? { ...t, status: 'open', completedAt: null } : t,
            ),
          }))
        },

        generateBriefing: async () => {
          setPending('briefing', { status: 'loading', error: null })
          try {
            await get().runAutomation('daily_briefing', {})
            const failure = get().pending['automation:daily_briefing']
            setPending('briefing', failure?.status === 'error' ? failure : idle)
          } catch (error) {
            setPending('briefing', {
              status: 'error',
              error: error instanceof Error ? error.message : 'Could not generate the briefing.',
            })
          }
        },

        askAnalyst: async (question) => {
          setPending('analyst', { status: 'loading', error: null })
          try {
            const answer = await provider().answerBusinessQuestion(question, context())
            set((state) => ({
              answers: [answer, ...state.answers].slice(0, 10),
              activities: logActivity(
                state.activities,
                'ai_analysis',
                'ai',
                `Business question answered: "${question}"`,
                answer.unsupported ? 'No supporting data available for this question.' : answer.answer,
              ),
            }))
            setPending('analyst', idle)
          } catch (error) {
            setPending('analyst', {
              status: 'error',
              error: error instanceof Error ? error.message : 'The analyst could not answer that.',
            })
          }
        },

        clearAnswers: () => set({ answers: [] }),
      }
    },
    {
      name: 'relay-demo-state',
      version: 1,
      /**
       * A persisted engine choice should only survive if a person actually made
       * one. Otherwise the first visit's default would be frozen into storage
       * and later changes to VITE_AI_PROVIDER would be silently ignored.
       */
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<RevampState>
        return {
          ...current,
          ...saved,
          providerKey: saved.providerChosenByUser ? (saved.providerKey ?? current.providerKey) : current.providerKey,
        }
      },
      partialize: (state) => ({
        customers: state.customers,
        enquiries: state.enquiries,
        leads: state.leads,
        opportunities: state.opportunities,
        issues: state.issues,
        tasks: state.tasks,
        activities: state.activities,
        weeks: state.weeks,
        runs: state.runs,
        briefing: state.briefing,
        answers: state.answers,
        providerKey: state.providerKey,
        providerChosenByUser: state.providerChosenByUser,
        signedIn: state.signedIn,
        guideDismissed: state.guideDismissed,
        seededAt: state.seededAt,
      }),
    },
  ),
)

export const selectBusinessContext = (state: RevampState): BusinessContext => ({
  weeks: state.weeks,
  leads: state.leads,
  opportunities: state.opportunities,
  issues: state.issues,
  tasks: state.tasks,
  enquiries: state.enquiries,
})

export const selectPending = (key: string) => (state: RevampState): AsyncState =>
  state.pending[key] ?? idle

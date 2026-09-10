# Architecture

Relay is a client-only React application. There is no backend. Everything below
runs in the browser, and the two integrations that do not (Ollama, n8n) are
optional and target the user's own machine.

## Layers

```
UI (pages, components)
        │  reads selectors, calls actions — never touches a provider directly
Store (zustand, persisted)
        │  the only place state changes
        ├── analytics/metrics.ts     pure derivations (no I/O, no React)
        ├── AutomationService        workflow seam
        └── AIProvider               engine seam
```

### 1. Domain model — `src/types/index.ts`

Every entity in the business is typed once: `Customer`, `Enquiry`,
`EnquiryAnalysis`, `ResponseDraft`, `Lead`, `Opportunity`, `SupportIssue`,
`Task`, `Activity`, `WeeklyMetric`, `AutomationRunRecord`. Nothing in the app
invents a shape locally.

### 2. Seed data — `src/data/seed.ts`

A deterministic generator, parameterised by "now", so timestamps always look
current in a demo and the same clock always produces the same dataset. Eight
enquiries are written by hand because the text is the input the analysis works
on; leads, opportunities and older weeks are generated from a seeded LCG.

The last two weeks are hand-set so the analyst demo has a real, explainable
story: revenue −14%, qualified leads −22%, concentrated in paid search, while
conversion and average deal value hold.

### 3. Rules engine — `src/ai/rules.ts`

Pure functions, no I/O, fully unit tested:

| Function | Responsibility |
| --- | --- |
| `scoreCategories` / `classify` | Weighted keyword scoring across six categories |
| `confidenceFor` | Separation between the winner and the runner-up |
| `urgencyScore` | Time-pressure language |
| `extractFields` | Company, headcount, service, deadline, budget, location |
| `estimateValue` | Service base value scaled by company size |
| `derivePriority` | Blends urgency, deal size, account size, existing-customer status and stated deadlines |

`derivePriority` is where the product judgement lives. A £14,000 website
redesign from a 150-person company with an October deadline comes out **high**,
with a four-hour response window. A CV comes out **low**. A production outage
from an existing customer comes out **urgent**, with a one-hour window.

### 4. AI seam — `src/ai/types.ts`

```ts
interface AIProvider {
  readonly id: string
  readonly mode: 'demo' | 'local'
  isAvailable(): Promise<boolean>
  analyseEnquiry(enquiry, context): Promise<EnquiryAnalysis>
  generateResponse(enquiry, analysis): Promise<ResponseDraft>
  generateBusinessBriefing(context): Promise<Briefing>
  answerBusinessQuestion(question, context): Promise<AnalystAnswer>
  recommendActions(context): Promise<RecommendedAction[]>
}
```

Two implementations:

- **`DemoAIProvider`** — composes the rules engine and the metric derivations.
  This is what the public demo runs on. It is genuinely analysing the input; it
  is not replaying canned strings. It is also not a language model, and the UI
  labels it "Demo AI" everywhere.
- **`LocalAIProvider`** — talks to Ollama. Crucially it *refines* the
  deterministic result rather than replacing it: the model may improve intent,
  next action and analyst prose, while priority, deal value, extracted fields
  and every metric stay rule-derived. A model cannot invent a number in this
  design. Parse failures and timeouts fall back to the deterministic path and
  say so in the reasoning trail.

`createProvider(key)` in `src/ai/index.ts` is the only place a concrete provider
is named.

### 5. Automation seam — `src/automation/`

```ts
interface AutomationAdapter {
  readonly id: 'demo' | 'n8n'
  isAvailable(): Promise<boolean>
  run(definition, input, deps): Promise<AutomationResult>
}
```

The important design decision: **an automation never mutates state**. It returns

```ts
type AutomationEffect =
  | { type: 'enquiry_analysed'; enquiryId; analysis }
  | { type: 'draft_generated'; enquiryId; draft }
  | { type: 'enquiry_status'; enquiryId; status }
  | { type: 'task_created'; task }
  | { type: 'issue_escalated'; issueId }
  | { type: 'briefing_generated'; briefing }
  | { type: 'activity'; activity }
```

and the store applies it. Three consequences:

1. An n8n run and a local run produce **identical** downstream behaviour, because
   both return the same effect list.
2. The workflow engine is testable without a DOM or a store.
3. The audit trail cannot drift from what actually happened, because the audit
   entries are themselves effects emitted by the step that did the work.

`AutomationService` picks the adapter: n8n when configured, the local engine
otherwise, and the local engine again if an n8n run throws — recording the
fallback in the activity log rather than hiding it.

### 6. Store — `src/store/useRelayStore.ts`

One zustand store, persisted to `localStorage`, holding the data, the settings
and a keyed map of async states so several panels can load independently. Every
mutation is an action; there is no state change anywhere else in the codebase.

`resetDemoData()` reseeds from scratch, which is what makes the demo repeatable.

### 7. Derivations — `src/analytics/metrics.ts`

Pure functions over state: dashboard KPIs, week-on-week deltas, SLA breaches,
pipeline by stage, priority sorting. Both the dashboard and the AI analyst read
from here, which is why the analyst can never contradict the charts.

### 8. UI — `src/pages`, `src/components`

Six screens. Layout primitives (`Card`, `Button`, `Badge`, `SegmentedControl`,
`StatCard`, `States`) carry the design tokens; pages compose them. Accessibility
choices worth noting:

- The segmented controls are real `<fieldset>`/`<input type="radio">` groups, so
  arrow-key navigation and screen-reader semantics come for free.
- Every icon is `aria-hidden` with a text label alongside it.
- Focus is visible globally via `:focus-visible`.
- `prefers-reduced-motion` disables every animation.
- Error and empty states are rendered as `role="alert"` / real text, not as
  colour alone.

## Data flow: one enquiry, start to finish

```
User clicks "Run AI analysis"
  → store.analyseEnquiry(id)
      → logs "enquiry entered the workflow"
      → AutomationService.run('new_enquiry', { enquiry })
          → adapter (local engine or n8n)
              → provider.analyseEnquiry()   classification, priority, extraction
              → build Task from the SLA hours
              → provider.generateResponse() draft in the right tone
              → emit AutomationEffect[]
      → store applies effects
          → enquiry.analysis, enquiry.draft, status = awaiting_approval
          → task appended
          → activity entries appended
      → dashboard metrics recompute from the new state

User clicks "Approve"
  → enquiry.status = responded, draft.approved = true
  → linked task closed
  → two audit entries: the approval, and a note that nothing was sent
```

## Testing strategy

89 tests across seven files, chosen to cover the parts where a bug would be
invisible rather than to chase a coverage number:

| File | What it protects |
| --- | --- |
| `ai/rules.test.ts` | Classification, urgency, extraction, value estimation, priority thresholds |
| `ai/demoProvider.test.ts` | End-to-end analysis, draft tone, briefing structure, analyst answers, refusal to answer unsupported questions, JSON extraction from model output |
| `analytics/metrics.test.ts` | Dashboard arithmetic, division-by-zero cases, week comparison, SLA breaches |
| `automation/demoAdapter.test.ts` | Every workflow's steps and effects, failure with no side effects, adapter selection and fallback |
| `store/useRelayStore.test.ts` | The full enquiry workflow, approval, rejection, analyst history, demo reset |
| `pages/Tasks.test.tsx` | Real user interactions: completing, reopening, filtering, sorting, empty state |
| `pages/Automations.test.tsx` | Running a workflow from the UI, the recoverable error panel, and the blocked-workflow explanation |

## Deployment

`vite build` produces a static bundle; GitHub Actions publishes it to GitHub
Pages on every push to `main`. `HashRouter` means deep links work without server
rewrite rules. There is no server, no database and no secret to rotate.

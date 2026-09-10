# Relay

**AI-powered business operations assistant.** Turn business activity into action.

Relay takes the things a business already receives — enquiries, complaints,
weekly numbers — and turns them into prioritised, explained, auditable actions.
A person approves anything that leaves the building.

**[▶ Open the live demo](https://sayamdev.github.io/relay/)** — no sign-up, no
API key, no install. All data is fictional.

---

## Try it in three minutes

The demo opens with a walkthrough on the dashboard. If you would rather skip it:

1. **Inbox → ABC Ltd**, a prospect asking about a website redesign.
2. **Run AI analysis.** Relay classifies it, sets a priority and a response
   window, extracts the commercial detail, opens a follow-up task and drafts a
   reply — one workflow, six steps.
3. **Approve** the draft. The decision is recorded and the linked task closes.
4. **Activity** shows everything that happened, in order, and who did it.
5. **Analyst → "Why did sales drop this week?"** for an answer separated into
   the answer, the evidence and what to do next.

**Reset demo** in the header puts everything back, so it can be shown again.

---

## Why I built this

Most businesses already collect plenty of operational information. What they
lack is the time to read it, decide what matters and act on it. An enquiry worth
£14,000 sits in an inbox next to a CV; a production outage looks the same as a
how-to question until someone opens it.

Relay is a small, honest demonstration of closing that gap: AI reads the
incoming work, decides what it is and how urgent it is, extracts the commercial
detail, opens the follow-up task and drafts the reply — then stops and waits for
a person. Every step it took is written to an audit trail, so the automation is
inspectable rather than magic.

The interesting part is not that it generates text. It is that the output is
connected to a workflow: analysis produces a task, the task has an owner and a
due time derived from the priority, approval closes the loop, and the numbers on
the dashboard move.

---

## How it works

### The worked example

This is the enquiry the demo opens with, exactly as it arrives:

> **Website redesign — request for pricing**
> Hi, we're looking for help redesigning our website. We have around 150
> employees and would ideally like the work completed before October. Our current
> site is eight years old and the checkout journey in particular is causing us
> problems. Could someone get back to us with an idea of pricing?
> — Helen Mbeki, Operations Director, ABC Ltd

Pressing **Run AI analysis** fires the `new_enquiry` workflow. Six steps:

**1 · Classify.** Six categories are scored by weighted keyword evidence.
`pricing`, `redesign`, `project` and `looking for help` add up to a decisive win
for *sales enquiry*. Confidence is how far the winner is ahead of the
runner-up — a separation score, labelled illustrative, not a probability.

**2 · Prioritise.** Urgency language, deal size, company size, existing-customer
status and any stated deadline are combined into points:

| Signal in this enquiry | Points |
| --- | --- |
| Estimated value ≥ £10,000 | +3 |
| Company size ≥ 100 staff | +1 |
| A deadline was stated ("October") | +1 |
| **Total → HIGH** | **5** |

Priority sets the response window: urgent 1h, high 4h, medium 24h, low 72h.
That window is a commitment the rest of the system honours — the task's due
time, the SLA-breach list on the dashboard, and what the reply is allowed to
promise.

**3 · Extract.** Company `ABC Ltd`, employees `150`, service
`Website redesign`, deadline `October`. Fields that are not present come back
`null` rather than guessed.

**4 · Size the deal.** A website redesign has a base value; company size scales
it. 150 staff → ×1.35 → **£9,500–£14,500**.

**5 · Open a task.** *"Follow up with ABC Ltd"*, assigned to the sales owner,
due in 4 hours, source *AI enquiry analysis*, linked back to the enquiry.

**6 · Draft the reply.** Consultative tone for sales, apologetic for support and
billing. The draft uses what was extracted: Helen's name, the October target,
the calculated price band.

Then it stops. Status becomes **awaiting approval** and the audit trail records
*"No message is sent until a person approves the draft."*

Approving marks the enquiry responded, closes the linked task, and writes two
entries: the approval (noting whether the draft was edited first) and a note
that nothing was sent to a real recipient.

### The two seams

Everything above is deterministic application logic. The two places where an
external engine could sit are behind interfaces, and the UI depends on the
interface only.

```
                        ┌─────────────────────────┐
                        │   React UI (6 screens)  │
                        │ Dashboard · Inbox ·     │
                        │ Analyst · Automations · │
                        │ Tasks · Activity        │
                        └───────────┬─────────────┘
                                    │  actions and selectors
                        ┌───────────▼─────────────┐
                        │   Relay store (zustand) │
                        │   + pure derivations    │
                        └─────┬──────────────┬────┘
                              │              │
              ┌───────────────▼──┐        ┌──▼─────────────────┐
              │ AutomationService │        │    AIProvider      │
              │   (workflow seam) │        │    (engine seam)   │
              └───┬───────────┬───┘        └───┬────────────┬───┘
                  │           │                │            │
        ┌─────────▼──┐   ┌────▼──────┐   ┌─────▼─────┐  ┌───▼──────────┐
        │ Local       │   │ n8n       │   │ Demo AI   │  │ Local AI     │
        │ workflow    │   │ webhook   │   │ (rules)   │  │ (Ollama)     │
        │ engine      │   │ (Docker)  │   │           │  │              │
        └─────────────┘   └───────────┘   └───────────┘  └──────────────┘
                  │           │
                  └─────┬─────┘
                        ▼
              AutomationEffect[]  ──►  store applies  ──►  tasks, drafts,
                                                            audit trail, metrics
```

Two rules hold the design together:

**Automations never mutate state.** A workflow returns a list of
`AutomationEffect` values — *enquiry analysed*, *task created*, *draft
generated*, *activity logged* — and the store applies them. So an n8n run and a
local run produce identical downstream behaviour, the workflow engine is
testable without a DOM, and the audit trail cannot drift from what actually
happened, because the audit entries *are* effects emitted by the step that did
the work.

**The UI never imports a concrete AI provider.** Swapping the rules engine for a
local model is a configuration change, not a rewrite.

### Where the numbers come from

Nothing on the dashboard is hard-coded. Every figure is derived from state by
pure functions in `src/analytics/metrics.ts`, which is also what the analyst
reads — so the analyst can never contradict the charts. Complete a task, approve
a response, run a workflow, and the numbers move.

---

## Honest scope

This is a portfolio demonstration, and it says so in the product.

| Claim | Reality |
| --- | --- |
| The demo AI | A **deterministic rules engine**, not a language model. It genuinely parses the enquiry text and the business data — it is not replaying canned strings — but it is rules, and the UI labels it "Demo AI" everywhere. |
| Local AI | Optional, and **verified working** against Ollama with `llama3.2`. The model rewrites intent, the next action and the reply; it is blocked from producing or contradicting a number. See below. |
| Confidence scores | A **rule separation score** — how far the winning classification is ahead of the runner-up. Illustrative. Not a calibrated probability, and no calibration has been performed. The UI says so wherever a score appears. |
| n8n | Optional, and it really works — see [`n8n/README.md`](n8n/README.md). The hosted demo cannot reach a webhook on your laptop, so it runs the local engine. |
| The data | Entirely fictional. Northwind Studio, its customers and every figure are invented. No real personal data exists anywhere in this repository. |
| Sending responses | Nothing is ever sent to a real recipient. Approval records a decision in the audit trail. |

---

## What it demonstrates

- **AI-assisted business analysis** — classification, priority, entity
  extraction, deal-value estimation, and an analyst that answers questions from
  real data and refuses when the data cannot support an answer
- **Workflow automation** — three production-shaped workflows behind an adapter
  interface, running locally or in n8n
- **Human-in-the-loop AI** — nothing is sent, escalated or closed without an
  explicit approval, and rejections are recorded too
- **Responsible AI boundaries** — validated model output, uncalibrated scores
  labelled as such, arithmetic kept away from the model
- **Full-stack engineering** — typed domain model, service seams, pure
  derivations, 108 tests, strict TypeScript
- **Auditability** — a complete activity trail of what the AI did and why
- **Responsive, accessible UX** — desktop-first, usable on a phone, keyboard
  navigable, `prefers-reduced-motion` respected

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 19, TypeScript (strict), Vite | Fast, typed, no framework server needed |
| Styling | Tailwind CSS v4 with CSS custom-property design tokens | One token layer, no runtime CSS-in-JS |
| State | Zustand with `localStorage` persistence | Small, typed, no provider tree; a demo survives refresh |
| Charts | Recharts | Simple, no licence cost |
| Routing | React Router (`HashRouter`) | Deep links work on static hosting with no rewrite rules |
| Tests | Vitest, Testing Library, jsdom | Same toolchain as the build |
| AI | `AIProvider`: `DemoAIProvider` (rules) / `LocalAIProvider` (Ollama) | Swap the engine without touching the UI |
| Automation | `AutomationAdapter`: local engine / n8n webhook | Same seam for workflows |
| Hosting | GitHub Pages via GitHub Actions | Free, static, no server to maintain |

Total running cost: **£0**. No paid API, database, auth provider or automation
platform is required at any point. The font is bundled, so the deployed page
makes **no third-party network requests at all**.

---

## Running locally

Requires Node 20 or newer.

```bash
git clone https://github.com/SayamDev/relay.git
cd relay
npm install
npm run dev
```

Open <http://localhost:5173>. No environment file is needed — with no
configuration at all, Relay runs in demo mode, which is the intended default.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Watch mode |
| `npm run typecheck` | TypeScript, strict, no emit |
| `npm run lint` | oxlint |

---

## Optional: local AI with Ollama

The demo does not need this. It exists to show the provider seam driving a real
model.

```bash
# 1. Install Ollama — https://ollama.com/download  (or: brew install ollama)
# 2. Pull a small instruct model
ollama pull llama3.2
# 3. Ollama serves on http://localhost:11434 automatically
```

Then either press **Switch to Local AI** in the app header, or set the default
in `.env.development.local`:

```bash
VITE_AI_PROVIDER=ollama
VITE_OLLAMA_MODEL=llama3.2
```

**What the model is allowed to do:** rewrite the enquiry's intent, propose the
next action, and write the reply.

**What it is not allowed to do:** produce a number, or contradict one. Priority,
deal value, extracted fields, the response window and every dashboard metric
stay rule-derived. Two guards enforce this at the boundary:

- A proposed next action is **rejected** unless it restates the response window
  the priority sets, so the model cannot quietly turn "within 4 hours" into "by
  the end of the week". The rejection is recorded in the reasoning trail.
- A commercial draft is **rejected** if it drops the calculated price band, and
  the deterministic draft is used instead.

**The briefing and the analyst stay deterministic in every mode.** Both are
arithmetic over the business data, and in testing llama3.2 rewrote "revenue
fell, driven by lead volume" into "driven by a decrease in conversion rate, as
the conversion rate increased" — contradicting the evidence rendered directly
beneath it. Correct numbers beat fluent phrasing, so the model is kept out of
that path.

If Ollama is unreachable, or a response will not parse, Relay falls back to the
deterministic path and says so in the reasoning trail.

Tested with Ollama 0.33.3 and `llama3.2` on Apple Silicon: roughly 7 seconds for
analysis plus draft, against about 1.3 seconds for the rules engine.

---

## Optional: real automation with n8n (Docker)

```bash
docker compose -f n8n/docker-compose.yml up -d
```

Import `n8n/new-enquiry-workflow.json`, activate it, and point Relay at the
webhook. Full instructions — including why the hosted demo cannot use it — are
in [`n8n/README.md`](n8n/README.md).

The workflow is `Webhook → Analyse enquiry (Code) → Return result`, and the Code
node is a port of the same rules the app uses, so n8n reaches the same
classification and priority. The Automations screen shows which adapter executed
each run, and falls back to the local engine if n8n is unreachable.

---

## Deployment

The demo is a static build on GitHub Pages, published by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main`. The workflow type-checks, lints and tests before it builds.

To deploy your own copy:

1. Fork or push this repository to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`.

If your repository is not named `relay`, change `REPOSITORY_BASE` in
`vite.config.ts`. There is nothing else to provision: no server, no database, no
secrets.

---

## Demo credentials

None. Relay has no accounts and no passwords — the entry screen is a demo gate,
not authentication, because there is nothing to protect. See
[`SECURITY.md`](SECURITY.md).

---

## Repository layout

```
src/
  ai/            AIProvider interface, deterministic rules, demo + Ollama providers
  automation/    Adapter interface, workflow definitions, local engine, n8n adapter
  analytics/     Pure metric derivations used by the dashboard and the analyst
  store/         Zustand store — the only place state changes
  data/          Fictional seed dataset
  components/    Layout, UI primitives, inbox panels, first-run walkthrough
  pages/         The six screens
  lib/           Formatting, time, ids
docs/            Architecture notes
n8n/             Optional Docker setup and importable workflow
```

Further reading:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — full technical walkthrough
- [`CEO-DEMO.md`](CEO-DEMO.md) — a 3–5 minute demonstration script
- [`SECURITY.md`](SECURITY.md) — security decisions, and what this project
  deliberately does not do
- [`n8n/README.md`](n8n/README.md) — running the workflow in real n8n

---

## Licence

MIT — see [`LICENSE`](LICENSE).

# Relay

**AI-powered business operations assistant.** Turn business activity into action.

Relay takes the things a business already receives — enquiries, complaints,
weekly numbers — and turns them into prioritised, explained, auditable actions.
A person approves anything that leaves the building.

**[Live demo](https://sayamdev.github.io/relay/)** · no sign-up, no API key, fictional data

---

## Why I built this

Most businesses already collect plenty of operational information. What they
lack is the time to read it, decide what matters and act on it. An enquiry that
is worth £14,000 sits in an inbox next to a CV; a production outage looks the
same as a how-to question until someone opens it.

Relay is a small, honest demonstration of closing that gap: AI reads the
incoming work, decides what it is and how urgent it is, extracts the commercial
detail, opens the follow-up task and drafts the reply — then stops and waits for
a person. Every step it took is written to an audit trail, so the automation is
inspectable rather than magic.

The interesting part is not that it generates text. It is that the output is
connected to a workflow: analysis produces a task, a task has an owner and a due
time derived from the priority, approval closes the loop and updates the numbers
on the dashboard.

---

## What it demonstrates

- **AI-assisted business analysis** — classification, priority, entity
  extraction, deal-value estimation and an analyst that answers questions from
  real data
- **Workflow automation** — three production-shaped workflows behind an adapter
  interface, running locally or in n8n
- **Human-in-the-loop AI** — nothing is sent, escalated or closed without an
  explicit approval, and rejections are recorded too
- **Full-stack engineering** — typed domain model, service seams, pure
  derivations, 105 tests, strict TypeScript
- **Data-driven decision support** — every dashboard figure is derived from
  state, so actions in the app change what the CEO sees
- **Auditability** — a complete activity trail of what the AI did and why
- **Responsive, accessible UX** — desktop-first, usable on a phone, keyboard
  navigable

---

## Honest scope

This is a portfolio demonstration, and it says so in the product. Specifically:

| Claim | Reality |
| --- | --- |
| The demo AI | A **deterministic rules engine**, not a language model. It genuinely parses the enquiry text and the business data — it is not replaying canned strings — but it is rules, and the UI labels it "Demo AI" everywhere. |
| Local AI | Optional, and **verified working** against Ollama with `llama3.2`. The model rewrites intent, the next action and the reply; it is blocked from producing or contradicting a number, and the briefing and analyst stay deterministic. Falls back to the rules if the model is unreachable or returns output that fails those checks. |
| Confidence scores | A **rule separation score** — how far the winning classification is ahead of the runner-up. Illustrative. It is not a calibrated probability and no calibration has been performed. The UI says this wherever a score appears. |
| n8n | Optional, and it really works — see [`n8n/README.md`](n8n/README.md). The hosted demo cannot reach a webhook on your laptop, so it runs the local engine. |
| The data | Entirely fictional. Northwind Studio, its customers and every figure are invented. No real personal data exists anywhere in this repository. |
| Sending responses | Nothing is ever sent to a real recipient. Approval records a decision in the audit trail. |

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 19, TypeScript (strict), Vite | Fast, typed, no framework server needed |
| Styling | Tailwind CSS v4 with CSS custom-property design tokens | One token layer, no runtime CSS-in-JS |
| State | Zustand with `localStorage` persistence | Small, typed, no provider tree; a demo survives refresh |
| Charts | Recharts | Simple, accessible enough, no licence cost |
| Routing | React Router (`HashRouter`) | Deep links work on static hosting with no rewrite rules |
| Tests | Vitest, Testing Library, jsdom | Same toolchain as the build |
| AI | `AIProvider` interface: `DemoAIProvider` (rules) / `LocalAIProvider` (Ollama) | Swap the engine without touching the UI |
| Automation | `AutomationAdapter` interface: local engine / n8n webhook | Same seam for workflows |
| Hosting | GitHub Pages via GitHub Actions | Free, static, no server to maintain |

Total running cost: **£0**. No paid API, database, auth provider or automation
platform is required at any point.

---

## Architecture

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
                        │   (analytics/metrics)   │
                        └─────┬──────────────┬────┘
                              │              │
              ┌───────────────▼──┐        ┌──▼─────────────────┐
              │ AutomationService │        │    AIProvider      │
              │   (adapter seam)  │        │   (engine seam)    │
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

1. **Automations never mutate state.** They return a list of `AutomationEffect`
   values and the store applies them. That is why an n8n run and a local run
   produce identical downstream behaviour, and why the workflow engine is
   testable without a DOM.
2. **The UI never imports a concrete AI provider.** It depends on the
   `AIProvider` interface only, so the engine is a configuration choice.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full walkthrough.

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
# 1. Install Ollama — https://ollama.com/download
# 2. Pull a small instruct model
ollama pull llama3.2
# 3. Ollama serves on http://localhost:11434 automatically
```

Then either switch engine in the app header ("Switch to Local AI"), or set the
default in `.env.development.local`:

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
that path and the engine label says which engine actually produced the answer.

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
webhook. Full instructions, including why the hosted demo cannot use it, are in
[`n8n/README.md`](n8n/README.md).

The workflow is `Webhook → Analyse enquiry (Code) → Return result`, and the Code
node is a port of the same rules the app uses, so n8n reaches the same
classification and priority. The Automations screen shows which adapter executed
each run.

---

## Deployment

The demo is a static build on GitHub Pages, published by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main`. To deploy your own copy:

1. Fork or push this repository to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The workflow runs the tests, builds, and publishes.

If your repository is not named `relay`, set `base` in `vite.config.ts` to
`/<your-repo-name>/`.

There is nothing else to provision: no server, no database, no secrets.

---

## Demo credentials

None. Relay has no accounts and no passwords — the entry screen is a demo gate,
not authentication, because there is nothing to protect. See
[`SECURITY.md`](SECURITY.md).

---

## Demo script

A 3–5 minute walkthrough for showing this to someone is in
[`CEO-DEMO.md`](CEO-DEMO.md).

---

## Repository layout

```
src/
  ai/            AIProvider interface, deterministic rules, demo + Ollama providers
  automation/    Adapter interface, workflow definitions, local engine, n8n adapter
  analytics/     Pure metric derivations used by the dashboard and the analyst
  store/         Zustand store — the only place state changes
  data/          Fictional seed dataset
  components/    Layout, UI primitives, inbox panels
  pages/         The six screens
  lib/           Formatting, time, ids
docs/            Architecture notes
n8n/             Optional Docker setup and importable workflow
```

---

## Licence

MIT — see [`LICENSE`](LICENSE).

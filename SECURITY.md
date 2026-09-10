# Security

Relay is a portfolio demonstration, but it is built the way a real product
should be. This document records the decisions rather than claiming a security
posture the project does not have.

## Threat model in one line

Relay is a **static, client-only application with no backend, no accounts and no
real personal data**. There is no server to compromise, no database to exfiltrate
and no credential to steal. Most of the security work therefore went into
keeping it that way.

## What the application holds

| Data | Where it lives | Notes |
| --- | --- | --- |
| Fictional demo dataset | Generated in the browser at runtime from `src/data/seed.ts` | Invented companies, people and figures |
| Demo state (analyses, drafts, tasks, activity) | `localStorage`, key `relay-demo-state` | The user's own browser only; never transmitted |
| Anything else | — | There is nothing else |

No analytics, telemetry, tracking pixels or third-party scripts are loaded. The
font is bundled with the application rather than fetched from a font CDN, so the
deployed page makes **no third-party network requests at all**.

## Secrets

- There are no API keys, tokens or connection strings in this repository, and
  none are required to run it.
- `.env`, `.env.local` and `.env.*.local` are gitignored;
  [`.env.example`](.env.example) documents the shape of the optional settings and
  contains no real values.
- The only environment variables the app reads are `VITE_`-prefixed and
  deliberately non-sensitive: which AI provider to use, a localhost Ollama URL,
  and a localhost n8n webhook URL. **Anything prefixed `VITE_` is compiled into
  the client bundle and is therefore public by definition** — that is why no
  secret is ever read this way.
- Local-machine configuration belongs in `.env.development.local`, not
  `.env.local`, so a production build can never inherit a URL that points at
  someone's laptop.

## Authentication

There is deliberately none. The entry screen is a **demo gate, not
authentication**: it frames the demo and makes the fictional nature of the data
unmissable before anyone sees a dashboard. Because Relay stores no personal data
and exposes no privileged operation, adding a login would create the appearance
of protection without protecting anything.

If this became a real product, the boundary is already in the right place: every
state change goes through the store, and every workflow through
`AutomationService`, so authorisation would be enforced at those two seams plus a
real backend.

## Input handling

- All user input (inbox search, the analyst question box, draft editing) is
  rendered as **text through React**, never through `dangerouslySetInnerHTML`.
  There is no `innerHTML` anywhere in the codebase.
- The analyst does not evaluate or execute the question; it matches it against a
  fixed set of known topics and refuses anything else rather than guessing.
- Model output from Ollama is parsed as JSON and **type-checked field by field**
  before use (`extractJson`, then explicit `typeof` guards). A malformed or
  hostile response falls back to the deterministic result rather than being
  trusted.
- Responses from n8n must contain an `effects` array or the run is rejected and
  the local engine takes over.

## Network calls

The deployed demo makes **no outbound requests**. The two optional integrations
both target the user's own machine:

| Integration | Endpoint | When |
| --- | --- | --- |
| Ollama | `http://localhost:11434` | Only when local AI is enabled |
| n8n | `http://localhost:5678/...` | Only when `VITE_AUTOMATION_ADAPTER=n8n` |

Both use `AbortSignal.timeout()` so a hung service cannot hang the UI, and both
fail closed to the deterministic path.

## AI-specific considerations

- **No autonomous outbound action.** The AI can recommend, classify and draft.
  It cannot send, escalate or close anything. `approveDraft` is only ever called
  from a click, and the audit trail records who approved what and whether the
  draft was edited first.
- **Confidence is not dressed up as certainty.** The score shown is a rule
  separation score and is labelled as illustrative, uncalibrated and not a
  probability, next to every place it appears.
- **The analyst refuses to answer what the data cannot support**, returning an
  explicit "no supporting data" state rather than a plausible fabrication.
- **Numbers are never model-generated, and model claims are validated, not
  trusted.** Even with a local model enabled, priority, deal value, extracted
  fields and every metric are computed by the deterministic layer, and the
  briefing and analyst are excluded from the model path entirely. Where the
  model does contribute wording, its output is checked before it is shown: a
  proposed next action is rejected unless it restates the response window the
  priority sets, and a commercial draft is rejected if it drops the calculated
  price band. Both rejections fall back to the deterministic output, and the
  first is recorded in the reasoning trail.
- **Every AI action is auditable.** The activity log records the actor (AI,
  automation, person or system), the decision and the reasoning behind it.

## Dependencies

Runtime dependencies are deliberately few: React, React Router, Zustand,
Recharts, Lucide icons, clsx and a bundled font. `npm audit` reported no
vulnerabilities at the time of writing. Anyone forking this should run
`npm audit` again — the number that matters is today's, not the one in a README.

## Error handling

- A React error boundary wraps the application and each page, so one failing
  panel cannot take down a demo.
- Users never see a stack trace. Failures show a plain message and a retry;
  details go to the console only.
- Every asynchronous workflow has an explicit loading, success and failure
  state, and a failed AI call leaves the underlying data untouched.

## If Supabase or a backend were added

The project intentionally does not use one — a static demo has no need for a
database, and adding one would introduce a service to secure and pay for. If it
were added, the requirements would be: row-level security on every table, no
service-role key in the client, and the anon key scoped so that reads and writes
are impossible without a policy that names them.

## Reporting a problem

This is a demonstration project with no production users. If you find something
worth fixing, please open an issue on the repository.

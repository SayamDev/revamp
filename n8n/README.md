# Optional: running the workflow in n8n

Relay ships with its own local workflow engine, so **none of this is required**. The
public demo and `npm run dev` both work with nothing installed. This directory
exists to show the same workflow executing in a real automation platform.

## What it demonstrates

`AutomationService` talks to an adapter interface, not to a workflow engine:

```
Relay UI → AutomationService → AutomationAdapter → local engine  (default)
                                                 → n8n webhook   (optional)
```

Both adapters return the same `{ steps, effects }` payload, so the audit trail,
tasks and drafts come out identical either way. If n8n is configured but not
reachable — or a run fails — Relay falls back to the local engine and records
that it did.

## Requirements

Docker. That is all.

## 1. Start n8n

```bash
docker compose -f n8n/docker-compose.yml up -d
```

Open <http://localhost:5678>. n8n asks you to create a local owner account the
first time; it is stored only in the container's volume on your machine.

## 2. Import the workflow

In n8n: **Workflows → ⋯ → Import from file** and choose
`n8n/new-enquiry-workflow.json`.

The workflow is three nodes:

```
Webhook (POST /webhook/relay-enquiry)
        ↓
Analyse enquiry (Code node — classify, prioritise, extract, task, draft)
        ↓
Return result (steps + effects back to Relay)
```

The Code node is a direct port of `src/ai/rules.ts`, so n8n reaches the same
classification and priority as the app does.

## 3. Activate it

Toggle the workflow **Active**. This is what publishes the production webhook at
`http://localhost:5678/webhook/relay-enquiry`. The editor's "Test workflow"
URL (`/webhook-test/...`) only fires once per click and is not what Relay uses.

## 4. Point Relay at it

Create `.env.development.local` in the project root (development only, so a
production build never points at your laptop):

```bash
VITE_AUTOMATION_ADAPTER=n8n
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/relay-enquiry
```

Restart `npm run dev`. Open an enquiry in the inbox and run the analysis — the
Automations page will now show **n8n** as the executing adapter, and the run
appears in n8n's own execution list.

Stop n8n with:

```bash
docker compose -f n8n/docker-compose.yml down
```

## Why the hosted demo does not use this

The deployed demo is a static site on GitHub Pages. It cannot reach a webhook on
your laptop, and exposing one publicly would mean a tunnel or a paid host.
Relay is built so that this is a configuration detail rather than a dependency:
the hosted demo runs the local engine, and your machine can run the real thing.

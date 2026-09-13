# Revamp — demo script

A 3–5 minute walkthrough. Open the demo, then follow the eight steps below.

**Before you start:** click **Reset demo** in the header. That returns every
enquiry, task and activity to its starting state — and brings back the
three-step walkthrough on the dashboard — so the demo works the same way every
time.

---

### 1 · Dashboard — 30 seconds

> "This is the operations picture for a fictional agency. Eighteen live leads,
> thirty-one open opportunities, seven customer issues, £380,000 of weighted
> pipeline."

Point out that none of these are hard-coded — they are derived from the
underlying data, so anything done in the app changes them.

### 2 · Today's briefing — 30 seconds

> "Rather than making someone read all of that, Revamp writes the summary."

Read the three headings aloud: **what changed**, **what needs attention**,
**opportunity**. Note the recommended actions underneath.

> "Revenue is down 14% week on week. It has already worked out that paid search
> is the reason, and that three things need attention today."

### 3 · Inbox — 30 seconds

Open **Inbox**. Select **ABC Ltd — Website redesign, request for pricing**.

> "This is what actually arrives. A prospect asking about a website redesign.
> Nothing has touched it yet."

### 4 · Run the AI analysis — 45 seconds

Click **Run AI analysis** and let it run.

> "That is one workflow running end to end."

Walk through the result:

- **Sales enquiry**, **HIGH** priority, respond within 4 hours
- **Estimated value £9,500–£14,500**
- **Extracted:** ABC Ltd · 150 employees · website redesign · October

Open **"Why this result?"**.

> "And it shows its working — which signals it matched, why the priority is
> high, and a confidence score that we deliberately label as illustrative rather
> than pretending it is a calibrated probability."

### 5 · The suggested response — 30 seconds

Scroll to the draft.

> "It has also written the reply, and it has used what it extracted — Helen's
> name, the October target, the price band it calculated."

> **Before you click, point at "Automated actions" on the dashboard.** It moves
> when you run this. None of the headline figures are hard-coded — they are
> derived from the data, so what you do here changes what the dashboard says.

### 6 · Approve — 30 seconds

Point at the approval panel before clicking.

> "This is the part I care about most. Revamp will not send anything on its own.
> It recommends, a person decides."

Click **Approve**.

> "That records the decision, and closes the follow-up task it opened
> automatically."

### 7 · Activity log — 30 seconds

Open **Activity**.

> "Everything that just happened, in order — enquiry received, classified,
> information extracted, task created, draft generated, waiting for approval,
> approved by a person. If a CEO asks 'why did the system do that', this is the
> answer."

Use the **AI / Automation / People** filter to show who did what.

### 8 · Ask a business question — 45 seconds

Open **Analyst** and click **"Why did sales drop this week?"**.

> "And it separates the three things people usually mix together: the answer,
> the evidence behind it, and what to do about it."

Read out:

- **Answer:** revenue decreased 14% — £53,320 against £62,000
- **Main driver:** qualified lead volume fell 22.2%, concentrated in paid search
- **Evidence:** qualified leads −22.2%, conversion +2.9%, average deal value +7.5%
- **Recommended action:** review paid search allocation, follow up the largest
  open opportunities

> "Conversion and deal value held. It was volume, in one channel. That is a
> decision a leader can act on."

---

### Closing line

> "I built this so the AI is not just generating text. It analyses information,
> recommends actions and connects those recommendations to real workflows — while
> a person stays in control of every decision that leaves the building."

---

## Optional extras, if there is time

**Automations (30s)** — three workflows, their triggers, their steps and their
run history. Mention that the same workflow can execute in n8n and that the
screen shows which engine ran it.

**Local AI (15s)** — "Switch to Local AI" in the header points the same
interface at a model running on my own machine through Ollama. The public demo
runs the deterministic engine so it costs nothing to host and cannot break on a
missing API key.

**Mobile (15s)** — open the same URL on a phone.

**Honesty (15s)** — the demo AI is a rules engine, not a language model, and the
product says so on every screen. Nothing is sent to a real recipient. All data
is fictional.

---

## If something goes wrong mid-demo

Click **Reset demo** in the header. It restores the starting state immediately,
and the demo can be run again from step 1.

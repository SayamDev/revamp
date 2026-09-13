import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { useRevampStore } from '@/store/useRevampStore'

const STEPS = [
  {
    title: 'Open an enquiry',
    body: 'Go to the inbox and pick the enquiry from ABC Ltd — a prospect asking about a website redesign.',
  },
  {
    title: 'Run the AI analysis',
    body: 'Revamp classifies it, sets a priority and response window, extracts the commercial detail, opens a follow-up task and drafts a reply.',
  },
  {
    title: 'Approve the response',
    body: 'Nothing is sent without you. Approving records the decision and closes the task — then check the activity log to see every step.',
  },
]

/**
 * First-run walkthrough.
 *
 * A dashboard is not self-explanatory to someone seeing it for the first time,
 * and the thing worth showing is a workflow, not a number. This points at it in
 * three steps and then gets out of the way. "Reset demo" brings it back, so a
 * repeat demo starts the same way as the first.
 */
export function GuidedStart() {
  const dismissed = useRevampStore((state) => state.guideDismissed)
  const dismissGuide = useRevampStore((state) => state.dismissGuide)

  if (dismissed) return null

  return (
    <section
      aria-labelledby="guided-start-heading"
      className="rise-in relative rounded-[10px] border border-accent-soft bg-accent-soft/45 px-5 py-4"
    >
      <button
        type="button"
        onClick={dismissGuide}
        aria-label="Dismiss the walkthrough"
        className="absolute top-3 right-3 rounded p-1 text-accent-ink/60 transition-colors hover:bg-surface/60 hover:text-accent-ink"
      >
        <X aria-hidden className="size-3.5" />
      </button>

      <h2 id="guided-start-heading" className="pr-8 text-[14px] font-semibold tracking-[-0.01em] text-accent-ink">
        New here? See the whole workflow in about three minutes.
      </h2>

      <ol className="mt-3 grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-2.5">
            <span className="tabular mt-px grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-semibold text-accent-ink">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink-900">{step.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-700">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          to="/inbox"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-accent-ink"
        >
          Start with the inbox
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
        <p className="text-[12px] text-ink-500">
          Everything here is fictional demo data, and nothing is ever sent to a real recipient.
        </p>
      </div>
    </section>
  )
}

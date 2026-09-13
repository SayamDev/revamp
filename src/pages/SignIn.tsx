import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRevampStore } from '@/store/useRevampStore'

const HIGHLIGHTS = [
  'Classifies inbound enquiries and sets priority from the message itself',
  'Opens follow-up tasks and drafts replies, then waits for a person to approve',
  'Answers questions about the business from the underlying data, with evidence',
]

/**
 * Demo gate, not authentication.
 *
 * Revamp has no accounts, no passwords and no personal data, so there is nothing
 * to protect. This screen exists to frame the demo and to make the fictional
 * nature of the data unmissable before anyone sees a dashboard.
 */
export function SignInPage() {
  const signIn = useRevampStore((state) => state.signIn)

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-md bg-ink-900 text-sm font-bold text-white"
            >
              R
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.015em] text-ink-900">Revamp</span>
          </div>

          <h1 className="mt-8 text-[28px] leading-[1.15] font-semibold tracking-[-0.025em] text-ink-900">
            Turn business activity into action.
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-500">
            An AI operations assistant for a fictional agency. It reads what comes in, decides what matters and
            prepares the next step — while a person stays in control of every decision that leaves the building.
          </p>

          <Button variant="primary" className="mt-7 w-full" onClick={signIn}>
            Enter the demo
            <ArrowRight aria-hidden className="size-4" />
          </Button>

          <div className="mt-5 flex gap-2.5 rounded-md border border-line bg-surface px-3.5 py-3">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-400" />
            <p className="text-[12.5px] leading-relaxed text-ink-500">
              No account, password or personal data is required. Everything you see is fictional demo data held
              in your own browser, and it can be reset at any time.
            </p>
          </div>
        </div>
      </div>

      <div className="hidden border-l border-line bg-surface lg:flex lg:items-center lg:px-12">
        <div className="max-w-md">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-ink-400 uppercase">
            What this demonstrates
          </p>
          <ul className="mt-5 space-y-5">
            {HIGHLIGHTS.map((highlight, index) => (
              <li key={highlight} className="flex gap-3.5">
                <span className="tabular mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line text-[12px] font-semibold text-ink-500">
                  {index + 1}
                </span>
                <p className="text-[14px] leading-relaxed text-ink-700">{highlight}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-400">
            The public demo runs on a deterministic rules engine so it costs nothing to host and never fails on
            a missing API key. The same interface drives a local model through Ollama when one is available.
          </p>
        </div>
      </div>
    </div>
  )
}

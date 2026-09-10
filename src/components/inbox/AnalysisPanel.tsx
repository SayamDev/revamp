import { Sparkles } from 'lucide-react'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import type { EnquiryAnalysis } from '@/types'
import { formatCurrencyRange } from '@/lib/format'
import { relativeTime } from '@/lib/time'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] text-ink-900">{value}</dd>
    </div>
  )
}

export function AnalysisPanel({ analysis }: { analysis: EnquiryAnalysis }) {
  const extracted = Object.entries(analysis.extracted).filter(([, value]) => value !== null)

  return (
    <div className="fade-in space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">
          <Sparkles aria-hidden className="size-3" />
          {analysis.categoryLabel}
        </Badge>
        <PriorityBadge priority={analysis.priority} />
        <span className="text-[12px] text-ink-400">
          Respond within {analysis.slaHours}h · analysed {relativeTime(analysis.analysedAt)}
        </span>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="Intent" value={analysis.intent} />
        <Field
          label="Estimated value"
          value={analysis.estimatedValue ? formatCurrencyRange(analysis.estimatedValue) : 'Not applicable'}
        />
      </dl>

      <div className="rounded-md border border-line bg-raised px-4 py-3">
        <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
          Recommended action
        </p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-900">{analysis.recommendedAction}</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
          Extracted information
        </p>
        {extracted.length === 0 ? (
          <p className="mt-1.5 text-[13px] text-ink-500">
            No structured fields were found in this message.
          </p>
        ) : (
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {extracted.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 border-b border-line py-1.5">
                <dt className="text-[13px] text-ink-500 capitalize">{key}</dt>
                <dd className="text-[13px] font-medium text-ink-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <details className="group rounded-md border border-line px-4 py-3">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-ink-700 select-none marker:hidden">
          <span className="group-open:hidden">Why this result?</span>
          <span className="hidden group-open:inline">Hide reasoning</span>
        </summary>
        <ul className="mt-2.5 space-y-1.5">
          {analysis.reasoning.map((line) => (
            <li key={line} className="flex gap-2 text-[13px] leading-relaxed text-ink-500">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-300" />
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-line pt-2.5">
          <p className="tabular text-[12px] text-ink-500">
            Rule separation score: <strong className="text-ink-900">{Math.round(analysis.confidence * 100)}%</strong>
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">
            Illustrative only. This measures how far the winning classification is ahead of the runner-up in
            the rules engine. It is not a calibrated probability, and no calibration has been performed.
          </p>
        </div>
      </details>
    </div>
  )
}

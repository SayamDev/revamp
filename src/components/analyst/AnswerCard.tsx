import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import type { AnalystAnswer } from '@/ai/types'
import { relativeTime } from '@/lib/time'

/**
 * One answer, kept deliberately separated into what happened, the evidence for
 * it, and what to do next — the three things a verbal answer usually runs
 * together. An unsupported question renders as a refusal rather than a guess.
 */
const DIRECTION_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }

export function AnswerCard({ answer }: { answer: AnalystAnswer }) {
  return (
    <Card className="rise-in">
      <CardBody className="space-y-4">
        <p className="text-[13px] text-ink-500">
          <span className="font-medium text-ink-700">Question</span> · {answer.question}
        </p>

        {answer.unsupported ? (
          <div className="rounded-md border border-warning-soft bg-warning-soft/60 px-4 py-3">
            <p className="text-[13px] font-semibold text-warning">No supporting data</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{answer.answer}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{answer.recommendation}</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">Answer</p>
              <p className="mt-1 text-[15px] leading-snug font-medium tracking-[-0.01em] text-ink-900">
                {answer.answer}
              </p>
            </div>

            {answer.driver && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                  Main driver
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">{answer.driver}</p>
              </div>
            )}

            {answer.evidence.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                  Supporting evidence
                </p>
                <dl className="mt-2 divide-y divide-line border-t border-line">
                  {answer.evidence.map((item) => {
                    const Icon = item.direction ? DIRECTION_ICON[item.direction] : null
                    return (
                      <div key={item.label} className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-[13px] text-ink-500 capitalize">{item.label}</dt>
                        <dd className="tabular flex items-center gap-1 text-[13px] font-medium text-ink-900">
                          {Icon && (
                            <Icon
                              aria-hidden
                              className={
                                item.direction === 'up'
                                  ? 'size-3 text-positive'
                                  : item.direction === 'down'
                                    ? 'size-3 text-critical'
                                    : 'size-3 text-ink-400'
                              }
                            />
                          )}
                          {item.value}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </div>
            )}

            <div className="rounded-md border border-line bg-raised px-4 py-3">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                Recommended action
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-900">{answer.recommendation}</p>
            </div>
          </>
        )}

        <p className="text-[11px] text-ink-400">
          Answered {relativeTime(answer.answeredAt)} · engine: {answer.providerId}
          {!answer.unsupported && ` · rule confidence ${Math.round(answer.confidence * 100)}% (illustrative)`}
        </p>
      </CardBody>
    </Card>
  )
}

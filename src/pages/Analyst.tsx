import { useState, type FormEvent } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus, Send, Sparkles, Trash2 } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonLines } from '@/components/ui/States'
import { useRelayStore } from '@/store/useRelayStore'
import type { AnalystAnswer } from '@/ai/types'
import { relativeTime } from '@/lib/time'

const SUGGESTIONS = [
  'Why did sales drop this week?',
  'Where are our leads coming from?',
  'How are response times looking?',
  'What is in the pipeline right now?',
  'How many support issues are open?',
]

const DIRECTION_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }

function AnswerCard({ answer }: { answer: AnalystAnswer }) {
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
                                    : 'size-3 text-ink-300'
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

        <p className="text-[11px] text-ink-300">
          Answered {relativeTime(answer.answeredAt)} · engine: {answer.providerId}
          {!answer.unsupported && ` · rule confidence ${Math.round(answer.confidence * 100)}% (illustrative)`}
        </p>
      </CardBody>
    </Card>
  )
}

export function AnalystPage() {
  const [question, setQuestion] = useState('')
  const answers = useRelayStore((state) => state.answers)
  const ask = useRelayStore((state) => state.askAnalyst)
  const clear = useRelayStore((state) => state.clearAnswers)
  const pending = useRelayStore((state) => state.pending['analyst'])
  const loading = pending?.status === 'loading'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (trimmed.length === 0 || loading) return
    setQuestion('')
    void ask(trimmed)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              Business analyst
              <Badge tone="accent">
                <Sparkles aria-hidden className="size-3" />
                AI
              </Badge>
            </span>
          }
          description="Questions are answered from the demo dataset only. If the data cannot support an answer, Relay says so rather than guessing."
        />
        <CardBody className="space-y-3">
          <form onSubmit={submit} className="flex gap-2">
            <label htmlFor="analyst-question" className="sr-only">
              Ask a question about the business
            </label>
            <input
              id="analyst-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Why did sales drop this week?"
              className="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:border-accent focus:outline-none"
            />
            <Button type="submit" variant="primary" loading={loading} disabled={question.trim().length === 0}>
              {!loading && <Send aria-hidden className="size-3.5" />}
              Ask
            </Button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setQuestion('')
                  void ask(suggestion)
                }}
                disabled={loading}
                className="rounded-full border border-line bg-raised px-2.5 py-1 text-[12.5px] text-ink-500 transition-colors hover:border-line-strong hover:text-ink-900 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {pending?.status === 'error' && (
        <ErrorState
          title="The analyst could not answer"
          description="Something went wrong while analysing the dataset. Try asking again."
        />
      )}

      {loading && (
        <Card>
          <CardBody>
            <SkeletonLines lines={5} />
          </CardBody>
        </Card>
      )}

      {answers.length === 0 && !loading ? (
        <Card>
          <EmptyState
            icon={<Sparkles aria-hidden className="size-6" />}
            title="Ask a question to get started"
            description="Try one of the suggestions above. Every answer is separated into the answer itself, the evidence behind it, and what to do next."
          />
        </Card>
      ) : (
        answers.map((answer) => <AnswerCard key={answer.answeredAt + answer.question} answer={answer} />)
      )}

      {answers.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={clear}>
            <Trash2 aria-hidden className="size-3.5" />
            Clear history
          </Button>
        </div>
      )}
    </div>
  )
}

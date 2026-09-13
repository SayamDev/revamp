import { useState, type FormEvent } from 'react'
import { Send, Sparkles, Trash2 } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { AnswerCard } from '@/components/analyst/AnswerCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonLines } from '@/components/ui/States'
import { useRevampStore } from '@/store/useRevampStore'

const SUGGESTIONS = [
  'Why did sales drop this week?',
  'Where are our leads coming from?',
  'How are response times looking?',
  'What is in the pipeline right now?',
  'How many support issues are open?',
]

export function AnalystPage() {
  const [question, setQuestion] = useState('')
  const answers = useRevampStore((state) => state.answers)
  const ask = useRevampStore((state) => state.askAnalyst)
  const clear = useRevampStore((state) => state.clearAnswers)
  const pending = useRevampStore((state) => state.pending['analyst'])
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
          description="Questions are answered from the demo dataset only. If the data cannot support an answer, Revamp says so rather than guessing."
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
              className="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 text-[13.5px] text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none"
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

import { useMemo, useState } from 'react'
import { ArrowLeft, Play, Search, Sparkles } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, PriorityBadge, StatusDot } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonLines } from '@/components/ui/States'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { AnalysisPanel } from '@/components/inbox/AnalysisPanel'
import { DraftPanel } from '@/components/inbox/DraftPanel'
import { useRelayStore } from '@/store/useRelayStore'
import type { Enquiry, EnquiryStatus } from '@/types'
import { relativeTime } from '@/lib/time'
import { cn } from '@/lib/cn'

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New',
  analysed: 'Analysed',
  awaiting_approval: 'Awaiting approval',
  responded: 'Responded',
  archived: 'Archived',
}

const STATUS_TONE: Record<EnquiryStatus, 'neutral' | 'info' | 'warning' | 'positive'> = {
  new: 'neutral',
  analysed: 'info',
  awaiting_approval: 'warning',
  responded: 'positive',
  archived: 'neutral',
}

type Filter = 'all' | 'new' | 'awaiting_approval' | 'responded'

function EnquiryRow({
  enquiry,
  selected,
  onSelect,
}: {
  enquiry: Enquiry
  selected: boolean
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(
          'w-full px-4 py-3 text-left transition-colors',
          selected ? 'bg-accent-soft/50' : 'hover:bg-raised',
        )}
      >
        <div className="flex items-center gap-2">
          <StatusDot tone={STATUS_TONE[enquiry.status]} />
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink-900">
            {enquiry.company}
          </span>
          <span className="tabular shrink-0 text-[12px] text-ink-400">
            {relativeTime(enquiry.receivedAt)}
          </span>
        </div>
        <p className="mt-1 truncate text-[13px] text-ink-700">{enquiry.subject}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {enquiry.analysis ? (
            <>
              <PriorityBadge priority={enquiry.analysis.priority} />
              <Badge tone="accent">{enquiry.analysis.categoryLabel}</Badge>
            </>
          ) : (
            <Badge tone="neutral">Not analysed</Badge>
          )}
        </div>
      </button>
    </li>
  )
}

function EnquiryDetail({ enquiry, onBack }: { enquiry: Enquiry; onBack: () => void }) {
  const analyse = useRelayStore((state) => state.analyseEnquiry)
  const pending = useRelayStore((state) => state.pending[`enquiry:${enquiry.id}`])
  const providerKey = useRelayStore((state) => state.providerKey)
  const analysing = pending?.status === 'loading'

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900 lg:hidden"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Back to inbox
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.015em] text-ink-900">
                {enquiry.subject}
              </h2>
              <p className="mt-1 text-[13px] text-ink-500">
                {enquiry.senderName} · {enquiry.company} ·{' '}
                <span className="text-ink-400">{enquiry.senderEmail}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[enquiry.status]}>{STATUS_LABEL[enquiry.status]}</Badge>
              <span className="text-[12px] text-ink-400">{relativeTime(enquiry.receivedAt)}</span>
            </div>
          </div>

          <pre className="mt-4 border-l-2 border-line pl-4 font-sans text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-700">
            {enquiry.body}
          </pre>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="AI analysis"
          description={
            enquiry.analysis
              ? 'Classification, priority and extracted fields from this message.'
              : 'Run the new-enquiry automation to classify this message, open a task and draft a reply.'
          }
          action={
            !enquiry.analysis && (
              <Button size="sm" variant="primary" loading={analysing} onClick={() => void analyse(enquiry.id)}>
                {!analysing && <Play aria-hidden className="size-3.5" />}
                Run AI analysis
              </Button>
            )
          }
        />
        <CardBody>
          {pending?.status === 'error' ? (
            <ErrorState
              title="AI analysis failed"
              description="We couldn't complete the AI analysis. You can retry, or continue working from the message itself."
              onRetry={() => void analyse(enquiry.id)}
            />
          ) : analysing ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[13px] text-ink-500">
                <Sparkles aria-hidden className="size-3.5 animate-pulse text-accent" />
                Running the new-enquiry workflow…
              </p>
              <SkeletonLines lines={5} />
            </div>
          ) : enquiry.analysis ? (
            <AnalysisPanel analysis={enquiry.analysis} />
          ) : (
            <EmptyState
              icon={<Sparkles aria-hidden className="size-6" />}
              title="Not analysed yet"
              description={`Relay will classify the enquiry, set a priority, extract the commercial detail, open a follow-up task and draft a reply using ${providerKey === 'ollama' ? 'your local model' : 'the demo rules engine'}.`}
            />
          )}
        </CardBody>
      </Card>

      {enquiry.analysis && (
        <Card>
          <CardHeader title="Suggested response" description="Reviewed and approved by a person before anything happens." />
          <CardBody>
            <DraftPanel enquiry={enquiry} />
          </CardBody>
        </Card>
      )}
    </div>
  )
}

export function InboxPage() {
  const enquiries = useRelayStore((state) => state.enquiries)
  const [selectedId, setSelectedId] = useState<string | null>(enquiries[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return enquiries
      .filter((enquiry) => {
        if (filter === 'new') return enquiry.status === 'new'
        if (filter === 'awaiting_approval') return enquiry.status === 'awaiting_approval'
        if (filter === 'responded') return enquiry.status === 'responded'
        return true
      })
      .filter((enquiry) =>
        needle === ''
          ? true
          : [enquiry.company, enquiry.senderName, enquiry.subject, enquiry.body]
              .join(' ')
              .toLowerCase()
              .includes(needle),
      )
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
  }, [enquiries, filter, query])

  const selected = enquiries.find((enquiry) => enquiry.id === selectedId) ?? null

  const counts = {
    all: enquiries.length,
    new: enquiries.filter((e) => e.status === 'new').length,
    awaiting_approval: enquiries.filter((e) => e.status === 'awaiting_approval').length,
    responded: enquiries.filter((e) => e.status === 'responded').length,
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_1fr]">
      <Card className={cn('overflow-hidden', selected && 'hidden lg:block')}>
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search aria-hidden className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-300" />
            <label htmlFor="inbox-search" className="sr-only">
              Search enquiries
            </label>
            <input
              id="inbox-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sender, company or message"
              className="h-8 w-full rounded-md border border-line bg-raised pr-3 pl-8 text-[13px] text-ink-900 placeholder:text-ink-300 focus:border-accent focus:bg-surface focus:outline-none"
            />
          </div>
          <div className="mt-2.5 overflow-x-auto">
            <SegmentedControl
              name="inbox-filter"
              legend="Filter enquiries by status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'new', label: 'New', count: counts.new },
                { value: 'awaiting_approval', label: 'Approval', count: counts.awaiting_approval },
                { value: 'responded', label: 'Done', count: counts.responded },
              ]}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No enquiries match"
            description={query ? `Nothing matches "${query}".` : 'Try a different filter.'}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="max-h-[calc(100dvh-16rem)] divide-y divide-line overflow-y-auto">
            {filtered.map((enquiry) => (
              <EnquiryRow
                key={enquiry.id}
                enquiry={enquiry}
                selected={enquiry.id === selectedId}
                onSelect={() => setSelectedId(enquiry.id)}
              />
            ))}
          </ul>
        )}
      </Card>

      {selected ? (
        <EnquiryDetail enquiry={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <Card className="hidden lg:block">
          <EmptyState
            title="Select an enquiry"
            description="Pick a message on the left to see the AI analysis, extracted fields and suggested response."
          />
        </Card>
      )}
    </div>
  )
}

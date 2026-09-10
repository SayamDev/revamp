import { Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, PriorityBadge, StatusDot } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/States'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { STATUS_TONE } from './status'
import type { Enquiry } from '@/types'
import { relativeTime } from '@/lib/time'
import { cn } from '@/lib/cn'

export type InboxFilter = 'all' | 'new' | 'awaiting_approval' | 'responded'

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

export function EnquiryList({
  enquiries,
  counts,
  query,
  filter,
  selectedId,
  onQueryChange,
  onFilterChange,
  onSelect,
  onClearFilters,
  className,
}: {
  enquiries: Enquiry[]
  counts: Record<InboxFilter, number>
  query: string
  filter: InboxFilter
  selectedId: string | null
  onQueryChange: (value: string) => void
  onFilterChange: (value: InboxFilter) => void
  onSelect: (id: string) => void
  onClearFilters: () => void
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search aria-hidden className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-400" />
          <label htmlFor="inbox-search" className="sr-only">
            Search enquiries
          </label>
          <input
            id="inbox-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search sender, company or message"
            className="h-8 w-full rounded-md border border-line bg-raised pr-3 pl-8 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-accent focus:bg-surface focus:outline-none"
          />
        </div>
        <div className="mt-2.5 overflow-x-auto">
          <SegmentedControl
            name="inbox-filter"
            legend="Filter enquiries by status"
            value={filter}
            onChange={onFilterChange}
            options={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'new', label: 'New', count: counts.new },
              { value: 'awaiting_approval', label: 'Approval', count: counts.awaiting_approval },
              { value: 'responded', label: 'Done', count: counts.responded },
            ]}
          />
        </div>
      </div>

      {enquiries.length === 0 ? (
        <EmptyState
          title="No enquiries match"
          description={query ? `Nothing matches "${query}".` : 'Try a different filter.'}
          action={
            <Button size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="max-h-[calc(100dvh-16rem)] divide-y divide-line overflow-y-auto">
          {enquiries.map((enquiry) => (
            <EnquiryRow
              key={enquiry.id}
              enquiry={enquiry}
              selected={enquiry.id === selectedId}
              onSelect={() => onSelect(enquiry.id)}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

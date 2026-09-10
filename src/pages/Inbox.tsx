import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/States'
import { EnquiryList, type InboxFilter } from '@/components/inbox/EnquiryList'
import { EnquiryDetail } from '@/components/inbox/EnquiryDetail'
import { useRelayStore } from '@/store/useRelayStore'

const matchesFilter = (status: string, filter: InboxFilter) =>
  filter === 'all' ? true : status === filter

/**
 * Two-pane on desktop, one pane at a time on small screens: selecting an
 * enquiry replaces the list, and the detail view offers a way back.
 */
export function InboxPage() {
  const enquiries = useRelayStore((state) => state.enquiries)
  const [selectedId, setSelectedId] = useState<string | null>(enquiries[0]?.id ?? null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<InboxFilter>('all')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return enquiries
      .filter((enquiry) => matchesFilter(enquiry.status, filter))
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

  const counts = useMemo(
    () => ({
      all: enquiries.length,
      new: enquiries.filter((enquiry) => enquiry.status === 'new').length,
      awaiting_approval: enquiries.filter((enquiry) => enquiry.status === 'awaiting_approval').length,
      responded: enquiries.filter((enquiry) => enquiry.status === 'responded').length,
    }),
    [enquiries],
  )

  const selected = enquiries.find((enquiry) => enquiry.id === selectedId) ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_1fr]">
      <EnquiryList
        enquiries={filtered}
        counts={counts}
        query={query}
        filter={filter}
        selectedId={selectedId}
        onQueryChange={setQuery}
        onFilterChange={setFilter}
        onSelect={setSelectedId}
        onClearFilters={() => {
          setQuery('')
          setFilter('all')
        }}
        className={selected ? 'hidden lg:block' : undefined}
      />

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

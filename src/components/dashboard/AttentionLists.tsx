import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge, PriorityBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/States'
import type { Enquiry, SupportIssue } from '@/types'
import { relativeTime } from '@/lib/time'

export function OverdueEnquiries({ enquiries }: { enquiries: Enquiry[] }) {
  return (
    <Card>
      <CardHeader
        title="Needs a response"
        description="Enquiries past the window their assigned priority sets."
        action={
          <Link
            to="/inbox"
            className="text-[13px] font-medium text-accent hover:text-accent-ink hover:underline"
          >
            Open inbox
          </Link>
        }
      />
      {enquiries.length === 0 ? (
        <EmptyState
          icon={<Clock aria-hidden className="size-6" />}
          title="Nothing is overdue"
          description="Every analysed enquiry is still inside its response window."
        />
      ) : (
        <ul className="divide-y divide-line">
          {enquiries.slice(0, 4).map((enquiry) => (
            <li key={enquiry.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink-900">{enquiry.company}</p>
                <p className="truncate text-[12.5px] text-ink-500">{enquiry.subject}</p>
              </div>
              {enquiry.analysis && <PriorityBadge priority={enquiry.analysis.priority} />}
              <span className="tabular shrink-0 text-[12px] text-ink-400">
                {relativeTime(enquiry.receivedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function OpenIssues({ issues }: { issues: SupportIssue[] }) {
  return (
    <Card>
      <CardHeader title="Open customer issues" description="Highest priority first." />
      {issues.length === 0 ? (
        <EmptyState title="No open issues" description="Every reported issue has been resolved." />
      ) : (
        <ul className="divide-y divide-line">
          {issues.map((issue) => (
            <li key={issue.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink-900">{issue.title}</p>
                <p className="truncate text-[12.5px] text-ink-500">
                  {issue.company} · {issue.category.replace('_', ' ')}
                </p>
              </div>
              <PriorityBadge priority={issue.priority} />
              {issue.status === 'escalated' && <Badge tone="critical">Escalated</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

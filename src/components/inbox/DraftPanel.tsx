import { useState } from 'react'
import { Check, Pencil, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ErrorState, SkeletonLines } from '@/components/ui/States'
import type { Enquiry } from '@/types'
import { useRevampStore } from '@/store/useRevampStore'
import { toast } from '@/store/toastStore'
import { relativeTime } from '@/lib/time'

export function DraftPanel({ enquiry }: { enquiry: Enquiry }) {
  const regenerate = useRevampStore((state) => state.regenerateDraft)
  const updateDraft = useRevampStore((state) => state.updateDraft)
  const approveDraft = useRevampStore((state) => state.approveDraft)
  const rejectDraft = useRevampStore((state) => state.rejectDraft)
  const pending = useRevampStore((state) => state.pending[`draft:${enquiry.id}`])

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(enquiry.draft?.body ?? '')

  // Reset the editor when a different enquiry is selected or the draft is
  // regenerated. Adjusting state during render is the documented alternative to
  // an effect here: it avoids the extra render pass an effect would cause.
  const draftKey = `${enquiry.id}:${enquiry.draft?.generatedAt ?? 'none'}`
  const [renderedKey, setRenderedKey] = useState(draftKey)
  if (draftKey !== renderedKey) {
    setRenderedKey(draftKey)
    setValue(enquiry.draft?.body ?? '')
    setEditing(false)
  }

  const loading = pending?.status === 'loading'
  const draft = enquiry.draft
  const approved = draft?.approved ?? false

  if (pending?.status === 'error') {
    return (
      <ErrorState
        title="Draft generation failed"
        description="We couldn't generate a response. You can retry, or write a reply yourself — the analysis above is unaffected."
        onRetry={() => void regenerate(enquiry.id)}
      />
    )
  }

  if (loading && !draft) return <SkeletonLines lines={6} />
  if (!draft) return null

  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{draft.tone} tone</Badge>
          {draft.edited && <Badge tone="info">Edited by a human</Badge>}
          {approved && (
            <Badge tone="positive">
              <Check aria-hidden className="size-3" />
              Approved
            </Badge>
          )}
          <span className="text-[12px] text-ink-400">Generated {relativeTime(draft.generatedAt)}</span>
        </div>
        {!approved && (
          <Button size="sm" variant="ghost" loading={loading} onClick={() => void regenerate(enquiry.id)}>
            <RefreshCw aria-hidden className="size-3.5" />
            Regenerate
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <label htmlFor={`draft-${enquiry.id}`} className="sr-only">
            Edit the response draft
          </label>
          <textarea
            id={`draft-${enquiry.id}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={14}
            className="w-full resize-y rounded-md border border-line-strong bg-surface px-3.5 py-3 text-[13.5px] leading-relaxed text-ink-900 focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                updateDraft(enquiry.id, value)
                setEditing(false)
                toast.success('Draft updated')
              }}
            >
              Save changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(draft.body)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <pre className="rounded-md border border-line bg-raised px-4 py-3.5 font-sans text-[13.5px] leading-relaxed whitespace-pre-wrap text-ink-900">
          {draft.body}
        </pre>
      )}

      {!approved && !editing && (
        <div className="rounded-md border border-line bg-surface px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink-900">Human approval required</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
                Revamp will not send anything on its own. Approving records the decision in the audit trail and
                closes the linked follow-up task. In this demo environment no message reaches a real recipient.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    approveDraft(enquiry.id)
                    toast.success('Response approved', 'Logged in the audit trail. Nothing was sent.')
                  }}
                >
                  <Check aria-hidden className="size-3.5" />
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    rejectDraft(enquiry.id)
                    toast.info('Draft rejected', 'The enquiry is back in the queue.')
                  }}
                >
                  <X aria-hidden className="size-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

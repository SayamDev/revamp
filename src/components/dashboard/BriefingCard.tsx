import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, SkeletonLines } from '@/components/ui/States'
import { useRelayStore } from '@/store/useRelayStore'
import { relativeTime } from '@/lib/time'

/**
 * The AI executive briefing.
 *
 * It generates itself once per seeded dataset so the dashboard is never empty
 * on arrival, and every figure it quotes is derived from the same data the
 * cards below it read — the briefing cannot contradict the dashboard.
 */
export function BriefingCard() {
  const briefing = useRelayStore((state) => state.briefing)
  const generateBriefing = useRelayStore((state) => state.generateBriefing)
  const pending = useRelayStore((state) => state.pending['briefing'])
  const providerKey = useRelayStore((state) => state.providerKey)
  const seededAt = useRelayStore((state) => state.seededAt)

  const loading = pending?.status === 'loading'

  // Generate once per seeded dataset; the user refreshes it manually after
  // that. Keying the guard on `seededAt` rather than a boolean means resetting
  // the demo produces a fresh briefing instead of an empty card, while still
  // stopping StrictMode's double-invoked effect from running it twice.
  const requestedFor = useRef<string | null>(null)
  useEffect(() => {
    if (briefing || loading || requestedFor.current === seededAt) return
    requestedFor.current = seededAt
    void generateBriefing()
  }, [briefing, loading, seededAt, generateBriefing])

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Today&apos;s briefing
            <Badge tone="accent">
              <Sparkles aria-hidden className="size-3" />
              {providerKey === 'ollama' ? 'Local AI' : 'Demo AI'}
            </Badge>
          </span>
        }
        description="Generated from the business data below, not from free text."
        action={
          <Button size="sm" loading={loading} onClick={() => void generateBriefing()}>
            Refresh
          </Button>
        }
      />
      <CardBody>
        {pending?.status === 'error' ? (
          <ErrorState
            title="AI analysis failed"
            description="We couldn't complete the briefing. You can retry, or keep using the dashboard — every figure below is calculated independently of the AI layer."
            onRetry={() => void generateBriefing()}
          />
        ) : loading && !briefing ? (
          <SkeletonLines lines={5} />
        ) : briefing ? (
          <div className="fade-in space-y-4">
            <p className="text-[15px] leading-snug font-semibold tracking-[-0.01em] text-ink-900">
              {briefing.headline}
            </p>
            <dl className="grid gap-4 sm:grid-cols-3">
              {briefing.sections.map((section) => (
                <div key={section.heading}>
                  <dt className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                    {section.heading}
                  </dt>
                  <dd className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{section.body}</dd>
                </div>
              ))}
            </dl>
            {briefing.recommendations.length > 0 && (
              <div className="rounded-md border border-line bg-raised px-4 py-3">
                <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-400 uppercase">
                  Recommended actions
                </p>
                <ul className="mt-2 space-y-1.5">
                  {briefing.recommendations.map((recommendation) => (
                    <li key={recommendation} className="flex gap-2 text-[13px] leading-relaxed text-ink-700">
                      <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/tasks"
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-900 transition-colors hover:bg-raised hover:border-ink-300"
                >
                  Review recommendations
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
            )}
            <p className="text-[11px] text-ink-400">
              Generated {relativeTime(briefing.generatedAt)} · engine: {briefing.providerId}
            </p>
          </div>
        ) : (
          <EmptyState title="No briefing yet" description="Generate one to see what changed today." />
        )}
      </CardBody>
    </Card>
  )
}

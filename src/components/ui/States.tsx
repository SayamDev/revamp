import type { ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />
}

export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={index === lines - 1 ? 'w-2/3' : undefined} />
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Retry',
  secondaryAction,
}: {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
  secondaryAction?: ReactNode
}) {
  return (
    <div role="alert" className="rounded-md border border-critical-soft bg-critical-soft/60 px-4 py-3.5">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-critical" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-critical">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{description}</p>
          {(onRetry || secondaryAction) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                  <RotateCw aria-hidden className="size-3.5" />
                  {retryLabel}
                </Button>
              )}
              {secondaryAction}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

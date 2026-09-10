import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('card', className)}>{children}</section>
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        // Stacks below `sm` so a header with filter controls cannot force the
        // page into horizontal scroll on a narrow phone.
        'flex flex-col gap-3 border-b border-line px-5 py-4',
        'sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>}
      </div>
      {action && <div className="min-w-0 max-w-full overflow-x-auto sm:shrink-0">{action}</div>}
    </header>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

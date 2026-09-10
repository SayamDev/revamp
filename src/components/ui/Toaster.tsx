import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import { cn } from '@/lib/cn'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const TONES = {
  success: 'text-positive',
  error: 'text-critical',
  info: 'text-info',
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant]
        return (
          <div
            key={toast.id}
            className="rise-in pointer-events-auto flex w-full max-w-sm gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-[var(--shadow-raised)]"
          >
            <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', TONES[toast.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-m-1 h-fit rounded p-1 text-ink-300 transition-colors hover:text-ink-700"
              aria-label="Dismiss notification"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

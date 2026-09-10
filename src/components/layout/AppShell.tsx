import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function DemoBanner() {
  return (
    <div className="border-b border-line bg-accent-soft/60">
      <p className="flex items-center gap-2 px-4 py-2 text-[12px] leading-relaxed text-accent-ink sm:px-6">
        <Info aria-hidden className="size-3.5 shrink-0" />
        <span>
          <strong className="font-semibold">Demo environment.</strong> All companies, people and figures are
          fictional. Approved responses are never sent to a real recipient.
        </span>
      </p>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Six navigation links precede the content on every page; this lets a
          keyboard or screen-reader user step over them. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:border focus:border-line-strong focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-ink-900 focus:shadow-[var(--shadow-raised)]"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <Topbar />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-[1180px]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

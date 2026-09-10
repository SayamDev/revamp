import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './nav'
import { cn } from '@/lib/cn'
import { useRelayStore } from '@/store/useRelayStore'

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-md bg-ink-900 text-[13px] font-bold text-white"
      >
        R
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.015em] text-ink-900">Relay</span>
    </div>
  )
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  // Two primitive selectors rather than one object selector: zustand compares
  // by reference, so returning a fresh object here would re-render every tick.
  const inboxCount = useRelayStore(
    (state) => state.enquiries.filter((e) => e.status === 'new' || e.status === 'awaiting_approval').length,
  )
  const taskCount = useRelayStore((state) => state.tasks.filter((t) => t.status !== 'done').length)

  const badgeFor = (to: string) => (to === '/inbox' ? inboxCount : to === '/tasks' ? taskCount : 0)

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo />
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">Turn business activity into action.</p>
      </div>

      <nav aria-label="Main" className="flex-1 px-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const badge = badgeFor(item.to)
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                      isActive
                        ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)]'
                        : 'text-ink-500 hover:bg-surface/70 hover:text-ink-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        aria-hidden
                        className={cn('size-4 shrink-0', isActive ? 'text-accent' : 'text-ink-400')}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className="tabular rounded bg-raised px-1.5 py-0.5 text-[11px] font-semibold text-ink-500">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="text-[11px] leading-relaxed text-ink-400">
          Northwind Studio · fictional demo business. No real customer data is used.
        </p>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-canvas lg:block">
      <div className="sticky top-0 h-dvh">
        <SidebarContent />
      </div>
    </aside>
  )
}

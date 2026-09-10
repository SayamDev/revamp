import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Check, Menu, RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react'
import { NAV_ITEMS } from './nav'
import { SidebarContent } from './Sidebar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useRelayStore } from '@/store/useRelayStore'
import { toast } from '@/store/toastStore'
import { cn } from '@/lib/cn'

function ProviderSwitch() {
  const providerKey = useRelayStore((state) => state.providerKey)
  const setProviderKey = useRelayStore((state) => state.setProviderKey)

  const isLocal = providerKey === 'ollama'

  return (
    <div className="flex items-center gap-2">
      <Badge tone={isLocal ? 'accent' : 'neutral'}>
        {isLocal ? <Bot aria-hidden className="size-3" /> : <Sparkles aria-hidden className="size-3" />}
        {isLocal ? 'Local AI' : 'Demo AI'}
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Switch to ${isLocal ? 'Demo AI' : 'Local AI'}`}
        onClick={async () => {
          const next = isLocal ? 'demo' : 'ollama'
          await setProviderKey(next)
          const nowAvailable = useRelayStore.getState().localProviderAvailable
          if (next === 'ollama' && !nowAvailable) {
            toast.info('Ollama not reachable', 'Relay will keep using deterministic analysis until it is running.')
          } else {
            toast.success(next === 'ollama' ? 'Local AI enabled' : 'Demo AI enabled')
          }
        }}
      >
        <RefreshCw aria-hidden className="size-3.5 sm:hidden" />
        <span className="hidden sm:inline">Switch to {isLocal ? 'Demo AI' : 'Local AI'}</span>
      </Button>
    </div>
  )
}

function ResetControl() {
  const [confirming, setConfirming] = useState(false)
  const resetDemoData = useRelayStore((state) => state.resetDemoData)

  if (!confirming) {
    return (
      <Button
        size="sm"
        variant="secondary"
        aria-label="Reset demo data"
        onClick={() => setConfirming(true)}
      >
        <RotateCcw aria-hidden className="size-3.5" />
        <span className="hidden sm:inline">Reset demo</span>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1">
      <span className="text-[12px] text-ink-500">Reset all demo data?</span>
      <Button
        size="sm"
        variant="primary"
        onClick={() => {
          resetDemoData()
          setConfirming(false)
          toast.success('Demo data reset', 'Every enquiry, task and activity is back to its starting state.')
        }}
      >
        <Check aria-hidden className="size-3.5" />
        Reset
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  )
}

export function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const current = NAV_ITEMS.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)))

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-1 rounded-md p-2 text-ink-500 transition-colors hover:bg-surface hover:text-ink-900 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu aria-hidden className="size-4.5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
              {current?.label ?? 'Relay'}
            </h1>
            <p className="hidden truncate text-[12px] text-ink-400 sm:block">{current?.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <ProviderSwitch />
            <ResetControl />
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fade-in fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink-900/30"
          />
          <div className={cn('absolute inset-y-0 left-0 w-64 border-r border-line bg-canvas shadow-[var(--shadow-overlay)]')}>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-3 rounded-md p-1.5 text-ink-400 hover:text-ink-900"
              aria-label="Close navigation menu"
            >
              <X aria-hidden className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}

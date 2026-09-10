import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
  /** Shown instead of the default panel, e.g. to scope a failure to one card. */
  fallbackTitle?: string
}

interface State {
  hasError: boolean
}

/**
 * Catches render-time failures so one broken panel cannot take down the demo.
 * The user sees a plain message; the stack goes to the console only.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Relay caught a render error', error, info.componentStack)
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div role="alert" className="card p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">
          {this.props.fallbackTitle ?? 'This section could not be displayed'}
        </h2>
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-500">
          Something went wrong while rendering this part of the page. The rest of Relay is still usable.
        </p>
        <Button className="mt-4" onClick={() => this.setState({ hasError: false })}>
          Try again
        </Button>
      </div>
    )
  }
}

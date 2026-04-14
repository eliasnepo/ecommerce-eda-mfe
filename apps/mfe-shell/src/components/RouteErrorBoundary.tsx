import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  children: ReactNode
  remoteName: string
}

interface State {
  hasError: boolean
}

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // no-op for PoC
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-card border border-danger/30 bg-red-50 p-5 text-sm text-danger"
          role="alert"
        >
          Failed to load {this.props.remoteName}. Please refresh the page.
        </div>
      )
    }

    return this.props.children
  }
}

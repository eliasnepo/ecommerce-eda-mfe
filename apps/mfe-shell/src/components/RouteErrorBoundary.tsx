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
        <div className="remote-error" role="alert">
          Failed to load {this.props.remoteName}. Please refresh the page.
        </div>
      )
    }

    return this.props.children
  }
}

import {Component, type ErrorInfo, type ReactNode} from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {hasError: false};
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {hasError: true};
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Handled via UI fallback
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 weatherly-sky-canvas">
          <div className="max-w-md w-full rounded-3xl bg-white/90 p-8 text-center shadow-lg">
            <h1 className="text-xl font-semibold text-[#0F1B3D]">Something drifted off course</h1>
            <p className="mt-2 text-sm text-[#475569]">
              Weatherly ran into an unexpected view error. Reload to restore the dashboard.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2.5 rounded-full bg-[#F97316] text-white text-sm font-medium hover:bg-[#EA580C] transition-colors"
            >
              Reload Weatherly
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

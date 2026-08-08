import React, { Component, ErrorInfo } from 'react';

export interface ErrorBoundaryProps {
  /** Child components to render under normal conditions */
  children: React.ReactNode;
  /** Optional custom fallback UI — overrides the default error card */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  /** Sanitised error message shown to the user */
  message: string;
}

/**
 * React class-based error boundary that catches unhandled render/lifecycle
 * errors in its subtree and displays a friendly fallback UI instead of
 * crashing the entire page.
 *
 * Logs the full error and component stack to the console in development only.
 * In production only a sanitised message is logged to avoid leaking internals.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <DashboardPage />
 * </ErrorBoundary>
 *
 * // With custom fallback:
 * <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *   <ChatPage />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message ?? 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // Full details in development
      console.error('[ErrorBoundary] Caught error:', error.message);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    } else {
      // Sanitised message only in production
      console.error('[ErrorBoundary] An error was caught in a component subtree.');
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="flex min-h-[400px] w-full items-center justify-center p-8">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-navy-900">
          {/* ChatFlow AI wordmark / logo */}
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-teal-500"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.9.52 3.67 1.42 5.19L2 22l4.81-1.42A9.956 9.956 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.7 0-3.29-.44-4.67-1.22l-.33-.19-3.43 1.01 1.01-3.43-.19-.33A7.948 7.948 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
            </svg>
            <span className="text-lg font-bold text-navy-900 dark:text-white">
              ChatFlow AI
            </span>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              An unexpected error occurred in this section. Your other tabs and
              conversations are unaffected.
            </p>
          </div>

          <button
            onClick={this.handleReload}
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-white transition duration-150 hover:bg-teal-600 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

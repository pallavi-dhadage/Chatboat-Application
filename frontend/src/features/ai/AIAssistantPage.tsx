import React, { Suspense } from 'react';
import { ErrorBoundary } from '../../components/layout/ErrorBoundary';
import Skeleton from '../../components/ui/Skeleton';

// Lazy-load the AIAssistant component so it splits into its own chunk
const AIAssistant = React.lazy(() => import('../../components/ai/AIAssistant'));

/**
 * Skeleton placeholder that matches the shape of the AIAssistant panel:
 * - header bar (title + subtitle)
 * - message bubbles area (alternating assistant / user)
 * - input bar at the bottom
 *
 * Validates: Requirements 15.2
 */
function AIAssistantSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading AI Assistant">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <Skeleton width="w-32" height="h-5" rounded="rounded" className="mb-1" />
        <Skeleton width="w-48" height="h-3" rounded="rounded" />
      </div>

      {/* Message bubbles */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        {/* Assistant bubble */}
        <div className="flex justify-start">
          <Skeleton width="w-64" height="h-10" rounded="rounded-2xl" />
        </div>
        {/* User bubble */}
        <div className="flex justify-end">
          <Skeleton width="w-40" height="h-8" rounded="rounded-2xl" />
        </div>
        {/* Assistant bubble */}
        <div className="flex justify-start">
          <Skeleton width="w-52" height="h-12" rounded="rounded-2xl" />
        </div>
        {/* User bubble */}
        <div className="flex justify-end">
          <Skeleton width="w-36" height="h-8" rounded="rounded-2xl" />
        </div>
        {/* Assistant bubble */}
        <div className="flex justify-start">
          <Skeleton width="w-56" height="h-10" rounded="rounded-2xl" />
        </div>
      </div>

      {/* Input bar */}
      <div className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
        <Skeleton width="w-full" height="h-9" rounded="rounded-lg" />
        <Skeleton width="w-16" height="h-9" rounded="rounded-lg" />
      </div>
    </div>
  );
}

/**
 * AIAssistantPage — page-level wrapper for the AIAssistant chat panel.
 *
 * Responsibilities:
 * - Wraps the `<AIAssistant>` component in an `<ErrorBoundary>` so any
 *   render error is contained and does not crash the rest of the app.
 * - Shows an `<AIAssistantSkeleton>` placeholder while the lazy-loaded
 *   `AIAssistant` chunk is being fetched (via `React.Suspense`).
 *
 * Validates: Requirements 15.2
 */
export default function AIAssistantPage() {
  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="mb-4 text-2xl font-bold text-navy-950 dark:text-white">AI Assistant</h1>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800">
        <ErrorBoundary>
          <Suspense fallback={<AIAssistantSkeleton />}>
            <AIAssistant />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

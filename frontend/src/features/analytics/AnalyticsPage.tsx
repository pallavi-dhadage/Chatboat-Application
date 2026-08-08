import React from 'react';
import AnalyticsDashboard from '../../components/analytics/AnalyticsDashboard';
import { MetricCardSkeleton } from '../../components/dashboard/MetricCardSkeleton';
import { useAnalytics } from '../../hooks/useAnalytics';

/**
 * AnalyticsPage — route-level page component for `/analytics`.
 *
 * Uses the `useAnalytics` hook to drive page-level loading and error states:
 * - While `isLoading`, renders four `<MetricCardSkeleton>` placeholders so the
 *   layout does not shift when data arrives (Requirement 12.3 / 16.2).
 * - When `isError`, renders an inline error message and a "Retry" button that
 *   calls `refetch()` (Requirement 12.4).
 * - When data is ready, delegates all rendering to `<AnalyticsDashboard>`.
 *
 * Validates: Requirements 12.3, 12.4
 */
export default function AnalyticsPage() {
  const { isLoading, isError, refetch } = useAnalytics();

  /* ── Loading state ─────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-navy-950 dark:text-white">Analytics</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  /* ── Error state ───────────────────────────────────────────────────────── */
  if (isError) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-red-500 dark:text-red-400">
          Failed to load analytics data. Please try again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white
                     transition-all duration-150 hover:scale-[1.02] hover:brightness-110
                     focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Success state — delegate to AnalyticsDashboard ───────────────────── */
  return <AnalyticsDashboard />;
}

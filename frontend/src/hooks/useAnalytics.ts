/**
 * React Query hook for fetching analytics data.
 * Uses a longer staleTime (60 s) because analytics aggregate data changes infrequently.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import type { AnalyticsPayload } from '../types';

/**
 * Fetches platform analytics from `GET /analytics`.
 *
 * Data is considered fresh for 60 seconds — double the global default — because
 * analytics aggregates change infrequently and extra refetches would be wasteful.
 *
 * @returns A React Query result containing {@link AnalyticsPayload} on success.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useAnalytics();
 * if (isLoading) return <MetricCardSkeleton />;
 * if (isError)  return <ErrorFallback />;
 * return <MetricCard value={data.message_volume} />;
 * ```
 */
export function useAnalytics(): UseQueryResult<AnalyticsPayload, Error> {
  return useQuery<AnalyticsPayload, Error>({
    queryKey: queryKeys.analytics,
    queryFn: () =>
      apiClient.get<AnalyticsPayload>('/analytics').then((r) => r.data),
    staleTime: 60_000,
  });
}

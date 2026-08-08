/**
 * React Query hook for fetching paginated messages within a conversation.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import type { PaginatedMessages } from '../types';

/**
 * Fetches paginated messages for a specific conversation from
 * `GET /conversations/{conversationId}/messages`.
 *
 * The query is disabled when `conversationId` is an empty string so the hook
 * is safe to call before a conversation has been selected.
 *
 * Real-time updates are applied by the `useSocket` hook via
 * `queryClient.setQueryData` — no polling is needed.
 *
 * @param conversationId - UUID of the conversation whose messages to load.
 *   Pass an empty string to keep the query disabled.
 * @returns A React Query result containing {@link PaginatedMessages} on success.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useMessages(conversationId);
 * if (isLoading) return <MessageThreadSkeleton />;
 * return <MessageThread messages={data?.messages ?? []} />;
 * ```
 */
export function useMessages(
  conversationId: string,
): UseQueryResult<PaginatedMessages, Error> {
  return useQuery<PaginatedMessages, Error>({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () =>
      apiClient
        .get<PaginatedMessages>(`/conversations/${conversationId}/messages`)
        .then((r) => r.data),
    enabled: Boolean(conversationId),
  });
}

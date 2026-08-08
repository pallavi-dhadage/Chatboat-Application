/**
 * React Query hook for fetching the current user's conversation list.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import type { Conversation } from '../types';

/**
 * Fetches the list of conversations for the authenticated user from `GET /conversations`.
 *
 * The result is cached with the global `staleTime` of 30 s and refetched on
 * window focus so the list stays current when the user switches tabs.
 *
 * @returns A React Query result containing an array of {@link Conversation} objects on success.
 *
 * @example
 * ```tsx
 * const { data: conversations = [], isLoading } = useConversations();
 * if (isLoading) return <ConversationListSkeleton />;
 * return <ConversationList items={conversations} />;
 * ```
 */
export function useConversations(): UseQueryResult<Conversation[], Error> {
  return useQuery<Conversation[], Error>({
    queryKey: queryKeys.conversations,
    queryFn: () =>
      apiClient.get<Conversation[]>('/conversations').then((r) => r.data),
  });
}

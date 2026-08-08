/**
 * React Query hook for fetching the current user's notifications.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import type { Notification } from '../types';

/**
 * Fetches the notification list for the authenticated user from `GET /notifications`.
 *
 * Uses the global 30 s `staleTime` and refetches on window focus so the
 * notification badge count stays accurate after the user returns to the tab.
 *
 * @returns A React Query result containing an array of {@link Notification} objects on success.
 *
 * @example
 * ```tsx
 * const { data: notifications = [] } = useNotifications();
 * const unread = notifications.filter((n) => n.read_at === null).length;
 * return <NotificationBadge count={unread} />;
 * ```
 */
export function useNotifications(): UseQueryResult<Notification[], Error> {
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications,
    queryFn: () =>
      apiClient.get<Notification[]>('/notifications').then((r) => r.data),
  });
}

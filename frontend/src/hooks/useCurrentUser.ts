/**
 * React Query hook for fetching the authenticated user's own profile.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { queryKeys } from '../lib/queryKeys';
import type { User } from '../types';

/**
 * Fetches the currently authenticated user's profile from `GET /users/me`.
 *
 * This hook complements the Zustand `Auth_Store` — the store holds the user
 * cached at login while this hook keeps server state authoritative and
 * re-synced on window focus.
 *
 * @returns A React Query result containing the {@link User} object on success.
 *
 * @example
 * ```tsx
 * const { data: user } = useCurrentUser();
 * return <Avatar src={user?.avatar_url} name={user?.name} />;
 * ```
 */
export function useCurrentUser(): UseQueryResult<User, Error> {
  return useQuery<User, Error>({
    queryKey: queryKeys.currentUser,
    queryFn: () =>
      apiClient.get<User>('/users/me').then((r) => r.data),
  });
}

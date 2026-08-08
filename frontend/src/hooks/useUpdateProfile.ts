/**
 * React Query mutation hook for updating the authenticated user's profile.
 */

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';
import type { User } from '../types';

/** Fields that can be updated via `PATCH /users/me`. */
export interface UpdateProfilePayload {
  /** Updated display name (2–100 characters). */
  name?: string;
  /** Short status message (up to 100 characters). */
  status?: string;
  /** User biography text (up to 500 characters). */
  bio?: string;
}

/**
 * Updates the authenticated user's profile via `PATCH /users/me`.
 *
 * On success:
 * - `queryKeys.currentUser` is invalidated so `useCurrentUser` refetches the
 *   updated profile from the server.
 * - `queryKeys.conversations` is invalidated because conversations embed sender
 *   display names that may have changed.
 *
 * @returns A React Query mutation result that resolves to the updated {@link User} object.
 *
 * @example
 * ```tsx
 * const updateProfile = useUpdateProfile();
 *
 * const handleSubmit = (values: ProfileFormValues) => {
 *   updateProfile.mutate(values, {
 *     onSuccess: (user) => {
 *       authStore.setUser(user);
 *       toast.success('Profile updated');
 *     },
 *   });
 * };
 * ```
 */
export function useUpdateProfile(): UseMutationResult<
  User,
  Error,
  UpdateProfilePayload
> {
  return useMutation<User, Error, UpdateProfilePayload>({
    mutationFn: (payload) =>
      apiClient.patch<User>('/users/me', payload).then((r) => r.data),
    onSuccess: () => {
      // Refetch the user profile so Auth_Store consumers see the latest data.
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      // Conversations embed sender names — invalidate so they reflect any name change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

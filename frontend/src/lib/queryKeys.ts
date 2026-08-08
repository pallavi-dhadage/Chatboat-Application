/**
 * Centralized query key definitions for React Query.
 * Using a typed constant prevents key typos and makes cache invalidation explicit.
 */

export const queryKeys = {
  currentUser:   ['currentUser']                    as const,
  analytics:     ['analytics']                      as const,
  conversations: ['conversations']                  as const,
  messages:      (id: string) => ['messages', id]   as const,
  notifications: ['notifications']                  as const,
} as const;

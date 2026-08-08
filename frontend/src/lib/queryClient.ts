/**
 * React Query client configuration.
 * Shared singleton used across the app via QueryClientProvider.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Data is considered fresh for 30 seconds */
      staleTime: 30_000,
      /** Retry failed requests up to 2 times with exponential backoff */
      retry: 2,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
      /** Revalidate in background when user re-focuses the window */
      refetchOnWindowFocus: true,
    },
    mutations: {
      /** Mutations are not retried automatically */
      retry: 0,
    },
  },
});

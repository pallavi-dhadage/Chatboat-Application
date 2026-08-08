import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/apiClient';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';
import type { AuthResponse, User } from '../types';

export interface UseAuthReturn {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** The authenticated user object, or null if not authenticated */
  user: User | null;
  /**
   * Log in with email and password.
   * Calls `POST /api/v1/auth/login`, stores the returned tokens via `setAuth`,
   * and invalidates the `currentUser` query so any cached profile is refreshed.
   *
   * @throws An error with a human-readable message if the request fails.
   */
  login: (email: string, password: string) => Promise<void>;
  /**
   * Log out the current user.
   * Calls `POST /api/v1/auth/logout` (best-effort — never throws),
   * then clears the Auth_Store, wipes the entire React Query cache,
   * and navigates to `/login`.
   */
  logout: () => Promise<void>;
}

/**
 * High-level authentication hook that combines Auth_Store state with
 * login/logout side-effects (HTTP calls, cache invalidation, navigation).
 *
 * Components should prefer this hook over calling `useAuthStore` directly
 * when they need to trigger authentication actions.
 *
 * @returns `{ isAuthenticated, user, login, logout }`
 *
 * @example
 * ```tsx
 * const { login, isAuthenticated } = useAuth();
 *
 * const handleSubmit = async ({ email, password }: LoginFormValues) => {
 *   await login(email, password);
 *   // router navigates to /dashboard inside login()
 * };
 * ```
 */
export function useAuth(): UseAuthReturn {
  const navigate = useNavigate();
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();

  const login = async (email: string, password: string): Promise<void> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    setAuth(data.access_token, data.refresh_token, data.user);
    // Invalidate any stale currentUser cache from a previous session
    await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
  };

  const logout = async (): Promise<void> => {
    try {
      // Best-effort — we don't block logout if the server call fails
      await apiClient.post('/auth/logout');
    } catch {
      // Intentionally swallowed
    } finally {
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  };

  return { isAuthenticated, user, login, logout };
}

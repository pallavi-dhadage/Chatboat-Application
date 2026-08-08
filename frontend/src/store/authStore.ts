/**
 * Auth_Store — Zustand slice for authentication state.
 *
 * Persists JWT tokens and user data to localStorage so sessions survive
 * page reloads. All three localStorage keys are prefixed with `cf_` to
 * avoid collisions with other apps on the same origin.
 */

import { create } from 'zustand';
import type { AuthState, User } from '../types';

/** localStorage key constants */
const LS_TOKEN   = 'cf_access_token';
const LS_REFRESH = 'cf_refresh_token';
const LS_USER    = 'cf_user';

/** Safely parse JSON from localStorage, returns null on any error */
function safeParse<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initialize from localStorage so authenticated sessions persist across reloads
  token:           localStorage.getItem(LS_TOKEN),
  refreshToken:    localStorage.getItem(LS_REFRESH),
  user:            safeParse<User>(LS_USER),
  isAuthenticated: Boolean(localStorage.getItem(LS_TOKEN)),

  /**
   * Populate store after successful login or token refresh.
   * Persists all three values to localStorage.
   */
  setAuth: (token: string, refreshToken: string, user: User) => {
    localStorage.setItem(LS_TOKEN,   token);
    localStorage.setItem(LS_REFRESH, refreshToken);
    localStorage.setItem(LS_USER,    JSON.stringify(user));
    set({ token, refreshToken, user, isAuthenticated: true });
  },

  /**
   * Clear all auth state and remove all `cf_*` keys from localStorage.
   * Called on logout or when token refresh fails.
   */
  clearAuth: () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  /**
   * Update only the user object in store and localStorage.
   * Called after a successful PATCH /api/v1/users/me.
   */
  setUser: (user: User) => {
    localStorage.setItem(LS_USER, JSON.stringify(user));
    set({ user });
  },
}));

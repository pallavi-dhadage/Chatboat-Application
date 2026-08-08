/**
 * Centralized Axios API client with JWT injection, token refresh, and error handling.
 *
 * - Reads VITE_API_URL from environment (falls back to http://localhost:5001 in dev)
 * - Attaches Authorization: Bearer <token> header to every request
 * - On 401: attempts one token refresh, retries original request, redirects to /login on failure
 * - On 429: parses Retry-After header into enriched error object
 * - Suppresses request/response body logging in production builds
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// Resolve base URL — warn in dev if env var is missing
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? (() => {
  if (import.meta.env.DEV) {
    console.warn('[apiClient] VITE_API_URL not set — falling back to http://localhost:5001');
  }
  return 'http://localhost:5001';
})();

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Use getState() (non-reactive read) — interceptors are outside React
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: refresh + error enrichment ────────────────────────
let _isRefreshing = false;
let _refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function flushQueue(error: unknown, token?: string): void {
  _refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  _refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // ── 401: attempt token refresh ──────────────────────────────────────────
    if (error.response?.status === 401 && !original._retry) {
      if (_isRefreshing) {
        // Queue this request to retry once the refresh completes
        return new Promise<string>((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      _isRefreshing = true;

      const { refreshToken, clearAuth } = useAuthStore.getState();

      if (!refreshToken) {
        _isRefreshing = false;
        clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<{ access_token: string }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          null,
          { headers: { Authorization: `Bearer ${refreshToken}` } },
        );

        const newToken = data.access_token;
        // Update store with new access token (keep existing refresh token and user)
        const state = useAuthStore.getState();
        state.setAuth(newToken, state.refreshToken!, state.user!);

        original.headers.Authorization = `Bearer ${newToken}`;
        flushQueue(null, newToken);
        return apiClient(original);
      } catch (refreshError) {
        flushQueue(refreshError);
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }

    // ── 429: enrich error with retryAfter ───────────────────────────────────
    if (error.response?.status === 429) {
      const retryAfterHeader = (error.response.headers as Record<string, string>)['retry-after'];
      const enriched = Object.assign(error, {
        retryAfter: retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined,
      });
      return Promise.reject(enriched);
    }

    // ── Development logging (suppressed in production) ──────────────────────
    if (!import.meta.env.PROD) {
      console.error(
        '[apiClient]',
        error.response?.status ?? 'NETWORK',
        error.config?.url,
        error.message,
      );
    }

    return Promise.reject(error);
  },
);

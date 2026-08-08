import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export interface ProtectedRouteProps {
  /** The content to render when the user is authenticated */
  children: React.ReactNode;
}

/**
 * Authentication guard wrapper for protected routes.
 *
 * Reads `isAuthenticated` from `Auth_Store`. When false, redirects the user
 * to `/login` and preserves the originally requested path as a `redirect`
 * query parameter so LoginPage can send them to their destination after
 * successful authentication.
 *
 * When true, renders `children` as-is.
 *
 * @example
 * ```tsx
 * // In the router:
 * <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
 *   <Route path="/dashboard" element={<DashboardPage />} />
 * </Route>
 * ```
 */
export function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { FullPageSkeleton } from './components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Route-based code splitting — each page is a separate JS chunk loaded on demand
// ---------------------------------------------------------------------------
const LoginPage       = React.lazy(() => import('./features/auth/LoginPage'));
const RegisterPage    = React.lazy(() => import('./features/auth/RegisterPage'));
const DashboardPage   = React.lazy(() => import('./features/dashboard/DashboardPage'));
const ChatPage        = React.lazy(() => import('./features/chat/ChatPage'));
const AIAssistantPage = React.lazy(() => import('./features/ai/AIAssistantPage'));
const AnalyticsPage   = React.lazy(() => import('./features/analytics/AnalyticsPage'));
const SettingsPage    = React.lazy(() => import('./features/settings/SettingsPage'));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{ duration: 3000 }}
          containerStyle={{ zIndex: 9999 }}
          gutter={8}
        />
        <Suspense fallback={<FullPageSkeleton />}>
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <ErrorBoundary>
                  <LoginPage />
                </ErrorBoundary>
              }
            />
            <Route
              path="/register"
              element={
                <ErrorBoundary>
                  <RegisterPage />
                </ErrorBoundary>
              }
            />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected routes nested inside the Layout shell */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/dashboard"
                element={
                  <ErrorBoundary>
                    <DashboardPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/chat"
                element={
                  <ErrorBoundary>
                    <ChatPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/chat/:conversationId"
                element={
                  <ErrorBoundary>
                    <ChatPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/ai"
                element={
                  <ErrorBoundary>
                    <AIAssistantPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ErrorBoundary>
                    <AnalyticsPage />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/settings"
                element={
                  <ErrorBoundary>
                    <SettingsPage />
                  </ErrorBoundary>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

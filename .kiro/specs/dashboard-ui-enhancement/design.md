# Design Document — Dashboard UI Enhancement

## Overview

This document describes the technical design for transforming the ChatFlow AI frontend from a minimal single-file React JSX application into a modern, production-quality TypeScript single-page application. The existing codebase consists of a single `App.jsx` file (~50 lines) rendering an analytics dashboard or chat view, a rudimentary Axios client at `src/api/client.js`, a basic Zustand auth store, and no routing. The backend (`local_server.py`) is a complete Flask REST API on port 5001 providing JWT authentication, real-time Socket.IO messaging, Groq AI features, and analytics endpoints — it is not modified by this enhancement.

The design delivers:

- **TypeScript migration** — strict-mode tsconfig, .tsx file renames, typed interfaces for all API shapes and store slices
- **Component architecture** — feature-oriented folder structure replacing the monolithic file
- **Collapsible sidebar layout** — 240 px / 64 px Framer Motion transition, mobile overlay, hamburger menu
- **Dashboard metric cards** — four KPI cards with skeleton loading, hover effects, and decorative SVG doodles
- **Zustand state management** — three store slices: Auth_Store, Chat_Store, UI_Store
- **React Router v6** — protected routes, redirect logic, lazy loading with Suspense skeletons
- **React Query** — query hooks for every data domain, cache invalidation, socket-driven cache updates
- **React Hook Form + Zod** — schema-validated login, register, and profile forms
- **Toast notifications** — react-hot-toast wired globally, typed success/error helpers
- **Error boundaries** — per-page class components with friendly fallback UI
- **Navy/teal TailwindCSS theme** — custom color tokens, responsive grid, dark mode
- **ESLint + Prettier + custom hooks** — enforced code quality and reusable patterns

The migration is additive: the Flask backend, Socket.IO integration, existing component files under `src/components/`, and the Recharts analytics chart are preserved and progressively wrapped by the new architecture.

---

## Architecture

### High-Level Component Tree

```
<App>
  <QueryClientProvider>
    <BrowserRouter>
      <Toaster />                          // react-hot-toast root
      <Routes>
        /login       → <ErrorBoundary> <LoginPage>
        /register    → <ErrorBoundary> <RegisterPage>
        /            → <Navigate to="/dashboard">
        /dashboard   → <ProtectedRoute> <ErrorBoundary> <Layout> <DashboardPage>
        /chat        → <ProtectedRoute> <ErrorBoundary> <Layout> <ChatPage>
        /chat/:id    → <ProtectedRoute> <ErrorBoundary> <Layout> <ChatPage>
        /ai          → <ProtectedRoute> <ErrorBoundary> <Layout> <AIAssistantPage>
        /analytics   → <ProtectedRoute> <ErrorBoundary> <Layout> <AnalyticsPage>
        /settings    → <ProtectedRoute> <ErrorBoundary> <Layout> <SettingsPage>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
</App>
```

### Folder Structure

```
frontend/src/
├── assets/
│   └── doodles/                   # Inline SVG React components
│       ├── DotGrid.tsx
│       ├── WaveCurve.tsx
│       └── CornerAccent.tsx
├── components/
│   ├── ui/                        # Reusable primitives
│   │   ├── Skeleton.tsx
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   └── Avatar.tsx
│   ├── layout/                    # Shell components
│   │   ├── Layout.tsx             # Two-column shell (Sidebar + main)
│   │   ├── Sidebar.tsx            # Collapsible nav
│   │   ├── Header.tsx             # Mobile top bar with hamburger
│   │   └── ProtectedRoute.tsx     # Auth guard wrapper
│   └── dashboard/                 # Dashboard-specific components
│       ├── MetricCard.tsx
│       ├── MetricCardSkeleton.tsx
│       ├── ConversationListSkeleton.tsx
│       └── MessageThreadSkeleton.tsx
├── features/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── chat/
│   │   └── ChatPage.tsx
│   ├── ai/
│   │   └── AIAssistantPage.tsx
│   ├── analytics/
│   │   └── AnalyticsPage.tsx
│   └── settings/
│       └── SettingsPage.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useTheme.ts
│   └── useToast.ts
├── lib/
│   ├── apiClient.ts               # Axios instance + interceptors
│   └── queryClient.ts             # QueryClient configuration
├── store/
│   ├── authStore.ts               # Auth_Store
│   ├── chatStore.ts               # Chat_Store
│   └── uiStore.ts                 # UI_Store
├── types/
│   └── index.ts                   # All shared TypeScript interfaces
├── main.tsx
├── App.tsx
└── index.css
```

### Request / Response Data Flow

```
User interaction
  → React component
    → React Query hook (useAnalytics, useMessages, etc.)
      → API_Client (Axios with JWT interceptor)
        → Flask backend (port 5001)
          → Response data
        → React Query cache (staleTime 30s)
      → Component re-render with data
    → Zustand store update (for auth/UI side effects)
  → Toast notification (on error or success)
```

### Real-Time Socket Flow

```
Socket.IO event (new_message)
  → useSocket hook
    → queryClient.setQueryData(['messages', conversationId], updater)
      → Component re-renders with new message (Framer Motion fade-in)
    → Chat_Store.addMessage (for local notification badge count)
```

---

## Components and Interfaces

### Layout Component

`src/components/layout/Layout.tsx`

Renders the two-column shell. On desktop (≥768 px) it shows `<Sidebar>` and the `<main>` content area side by side. On mobile it renders a fixed `<Header>` with the hamburger icon and hides the sidebar until the hamburger is tapped.

```tsx
interface LayoutProps {
  children: React.ReactNode;
}
```

The sidebar width is driven by `UI_Store.sidebarOpen`. Layout passes no props down to Sidebar; Sidebar reads the store directly. The `<main>` content area applies a CSS `margin-left` (or `padding-left`) transition matching the sidebar width change so content does not jump.

### Sidebar Component

`src/components/layout/Sidebar.tsx`

Framer Motion `<motion.aside>` animates `width` between `240` and `64` pixels over `300 ms` using `spring` or `tween` easing. Navigation items are defined as a static array and rendered in a `<nav>`. When collapsed, text labels fade out (`opacity: 0`) while icons remain visible.

```tsx
interface NavItem {
  /** Route path this item navigates to */
  path: string;
  /** Display label shown when sidebar is expanded */
  label: string;
  /** Heroicons or Lucide React icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Role required to see this item; undefined means all authenticated users */
  requiredRole?: 'admin' | 'moderator';
}
```

The user footer slot renders `<Avatar>`, display name, and `<Badge role={user.role}>`. It reads `Auth_Store.user` directly.

On mobile, the sidebar renders as a `position: fixed` overlay (`z-50`) with a semi-transparent `<div>` backdrop (`bg-black/40`). Tapping the backdrop calls `UI_Store.setSidebarOpen(false)`.

### Header Component

`src/components/layout/Header.tsx`

Visible only on mobile (`block md:hidden`). Renders the ChatFlow AI wordmark on the left and a hamburger `<button>` on the right that toggles `UI_Store.sidebarOpen`. Also renders the current user's avatar for quick access to Settings.

### ProtectedRoute Component

`src/components/layout/ProtectedRoute.tsx`

A wrapper component that reads `Auth_Store.isAuthenticated`. If false, it redirects to `/login?redirect=<current-path>` using React Router's `<Navigate>`. If true, it renders its `children`. Authenticated users visiting `/login` or `/register` are redirected to `/dashboard` via symmetric logic in those page components.

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
}
```

### MetricCard Component

`src/components/dashboard/MetricCard.tsx`

```tsx
interface MetricCardProps {
  /** KPI label shown above the value */
  label: string;
  /** Formatted value string (e.g. "1,234" or "380ms") */
  value: string;
  /** Trend direction for visual indicator */
  trend?: 'up' | 'down' | 'neutral';
  /** Functional icon shown on the left side of the card */
  icon: React.ComponentType<{ className?: string }>;
  /** Decorative SVG accent component for the top-right corner */
  decorativeIcon: React.ComponentType<{ className?: string }>;
  /** Base gradient class names for the card background */
  gradientClassName?: string;
}
```

Hover effects are applied via `whileHover={{ scale: 1.03 }}` on a Framer Motion `<motion.div>` wrapper, combined with TailwindCSS `transition-shadow duration-150 hover:shadow-xl`.

### Skeleton Component

`src/components/ui/Skeleton.tsx`

```tsx
interface SkeletonProps {
  /** Width as a Tailwind class or inline value (e.g. "w-32" or "100%") */
  width?: string;
  /** Height as a Tailwind class (e.g. "h-4") */
  height?: string;
  /** Optional border radius class (e.g. "rounded-full" for circles) */
  rounded?: string;
  /** Additional className overrides */
  className?: string;
}
```

The shimmer is a CSS `@keyframes` animation defined in `index.css` cycling between `bg-gray-200` and `bg-gray-300` (light) or `bg-gray-700` and `bg-gray-600` (dark) with a 1.5-second period.

### ErrorBoundary Component

`src/components/layout/ErrorBoundary.tsx`

A React class component implementing `componentDidCatch`. In development it logs `error.message` and `errorInfo.componentStack` to `console.error`. In production it logs only a sanitized message. Renders a centered fallback card with the ChatFlow AI logo, a human-readable message, and a "Reload page" button calling `window.location.reload()`.

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI to override the default */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}
```

### SVG Doodle Components

`src/assets/doodles/DotGrid.tsx`, `WaveCurve.tsx`, `CornerAccent.tsx`

Each is a pure functional component returning an inline `<svg>` with `aria-hidden="true"` and `focusable="false"`. Fill colors use `currentColor` so they respond to TailwindCSS text color utilities. They are positioned absolutely in the Dashboard background layer and do not capture pointer events (`pointer-events: none`).

```tsx
interface DoodleProps {
  /** Tailwind opacity class (e.g. "opacity-[0.07]") */
  className?: string;
}
```

---

## Data Models

### TypeScript Interfaces (`src/types/index.ts`)

```typescript
/** Authenticated user returned by /api/v1/users/me and /api/v1/auth/login */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'moderator' | 'admin';
  avatar_url: string | null;
  status: string | null;
  bio: string | null;
}

/** Conversation object returned by /api/v1/conversations */
export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group';
  created_at: string;               // ISO 8601
  last_message: string | null;
  last_message_time: string | null; // ISO 8601
  unread_count: number;
}

/** Single message object returned by /api/v1/conversations/:id/messages */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  text: string | null;
  file_url: string | null;
  sentiment_label: 'positive' | 'neutral' | 'negative' | null;
  sentiment_score: number | null;
  flagged: boolean;
  created_at: string; // ISO 8601
}

/** Notification object returned by /api/v1/notifications */
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** Analytics payload returned by /api/v1/analytics */
export interface AnalyticsPayload {
  message_volume: number;
  active_users: number;
  flagged_message_count: number;
  response_time_ms: number;
  sentiment_trend: SentimentDataPoint[];
  ai_insights: AIInsights;
}

export interface SentimentDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface AIInsights {
  smart_reply_requests: number;
  cache_hits: number;
  avg_latency_ms: number;
}

/** Response from /api/v1/ai/smart-replies */
export interface AISmartReplyResponse {
  replies: string[];
  ai_powered: boolean;
}

/** Response from /api/v1/ai/sentiment */
export interface AISentimentResponse {
  label: 'positive' | 'neutral' | 'negative';
  score: number;
  explanation: string;
}

/** Auth response from /api/v1/auth/login */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

/** Paginated messages response */
export interface PaginatedMessages {
  messages: Message[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}
```

### Zustand Store Interfaces (`src/types/index.ts` continued)

```typescript
/** Shape and actions of the Auth_Store */
export interface AuthState {
  /** Current JWT access token, null if unauthenticated */
  token: string | null;
  /** Current JWT refresh token, null if unauthenticated */
  refreshToken: string | null;
  /** Authenticated user object, null if unauthenticated */
  user: User | null;
  /** Derived boolean — true when token is non-null */
  isAuthenticated: boolean;
  /** Populate store after successful login or token refresh */
  setAuth: (token: string, refreshToken: string, user: User) => void;
  /** Clear all auth state and localStorage entries */
  clearAuth: () => void;
  /** Update the user object in store and localStorage after profile patch */
  setUser: (user: User) => void;
}

/** Shape and actions of the Chat_Store */
export interface ChatState {
  /** All conversations the current user is a participant of */
  conversations: Conversation[];
  /** ID of the conversation currently open in ChatPage */
  activeConversationId: string | null;
  /** Map of conversation ID → messages array */
  messages: Record<string, Message[]>;
  /** Map of conversation ID → array of display names currently typing */
  typingUsers: Record<string, string[]>;
  /** Replace the full conversations list */
  setConversations: (conversations: Conversation[]) => void;
  /** Set or clear the active conversation */
  setActiveConversation: (id: string | null) => void;
  /** Append a single message to a conversation's message list */
  addMessage: (conversationId: string, message: Message) => void;
  /** Update the typing users list for a conversation */
  setTypingUsers: (conversationId: string, users: string[]) => void;
}

/** Shape and actions of the UI_Store */
export interface UIState {
  /** Whether the sidebar is in expanded (true) or collapsed (false) state */
  sidebarOpen: boolean;
  /** Identifier of the currently active view, matches NavItem.path */
  activeView: string;
  /** Current color theme */
  theme: 'light' | 'dark';
  /** Flip sidebarOpen */
  toggleSidebar: () => void;
  /** Explicitly set sidebar open state */
  setSidebarOpen: (open: boolean) => void;
  /** Update the active view identifier */
  setActiveView: (view: string) => void;
  /** Toggle between light and dark, persist to localStorage, update DOM */
  toggleTheme: () => void;
}
```

### Zod Validation Schemas

```typescript
// src/features/auth/schemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const profileSchema = z.object({
  name: z.string().min(2).max(100),
  status: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
```

---
## Zustand Store Designs

### Auth_Store (`src/store/authStore.ts`)

```typescript
import { create } from 'zustand';
import type { AuthState, User } from '../types';

const LS_TOKEN   = 'cf_access_token';
const LS_REFRESH = 'cf_refresh_token';
const LS_USER    = 'cf_user';

export const useAuthStore = create<AuthState>((set) => ({
  token:           localStorage.getItem(LS_TOKEN),
  refreshToken:    localStorage.getItem(LS_REFRESH),
  user:            JSON.parse(localStorage.getItem(LS_USER) ?? 'null') as User | null,
  isAuthenticated: Boolean(localStorage.getItem(LS_TOKEN)),

  setAuth: (token, refreshToken, user) => {
    localStorage.setItem(LS_TOKEN,   token);
    localStorage.setItem(LS_REFRESH, refreshToken);
    localStorage.setItem(LS_USER,    JSON.stringify(user));
    set({ token, refreshToken, user, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    localStorage.setItem(LS_USER, JSON.stringify(user));
    set({ user });
  },
}));
```

Key design decisions:
- localStorage keys are prefixed `cf_` to avoid collisions with other apps on the same origin
- `isAuthenticated` is derived synchronously from the token at creation time so components never read a stale boolean
- The existing `src/store/authSlice.js` used `login`/`logout` async actions; the new design separates the HTTP calls into the React Query mutation layer and keeps the store as pure state

### Chat_Store (`src/store/chatStore.ts`)

```typescript
import { create } from 'zustand';
import type { ChatState, Conversation, Message } from '../types';

export const useChatStore = create<ChatState>((set) => ({
  conversations:        [],
  activeConversationId: null,
  messages:             {},
  typingUsers:          {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  setTypingUsers: (conversationId, users) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: users },
    })),
}));
```

Chat_Store holds ephemeral in-memory state for the active session. The canonical message list is owned by React Query; `addMessage` is called by the Socket.IO event handler to mirror incoming real-time messages into the query cache via `queryClient.setQueryData`, keeping both in sync.

### UI_Store (`src/store/uiStore.ts`)

```typescript
import { create } from 'zustand';
import type { UIState } from '../types';

const THEME_KEY = 'cf_theme';

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);
}

const savedTheme = (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null) ?? 'light';
applyTheme(savedTheme);

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeView:  '/dashboard',
  theme:       savedTheme,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveView:  (view) => set({ activeView: view }),

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return { theme: next };
    }),
}));
```

Theme is applied eagerly at module load time (before React renders) by calling `applyTheme(savedTheme)`, eliminating the "flash of unstyled content" caused by post-render DOM updates.

---

## React Router Route Configuration

`src/App.tsx`

```tsx
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { FullPageSkeleton } from './components/ui/Skeleton';

// Route-based code splitting — each page is a separate JS chunk
const LoginPage      = React.lazy(() => import('./features/auth/LoginPage'));
const RegisterPage   = React.lazy(() => import('./features/auth/RegisterPage'));
const DashboardPage  = React.lazy(() => import('./features/dashboard/DashboardPage'));
const ChatPage       = React.lazy(() => import('./features/chat/ChatPage'));
const AIAssistantPage = React.lazy(() => import('./features/ai/AIAssistantPage'));
const AnalyticsPage  = React.lazy(() => import('./features/analytics/AnalyticsPage'));
const SettingsPage   = React.lazy(() => import('./features/settings/SettingsPage'));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{ duration: 3000 }}
          containerStyle={{ zIndex: 9999 }}
        />
        <Suspense fallback={<FullPageSkeleton />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
            <Route path="/register" element={<ErrorBoundary><RegisterPage /></ErrorBoundary>} />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected routes wrapped in Layout */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard"          element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="/chat"               element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
              <Route path="/chat/:conversationId" element={<ErrorBoundary><ChatPage /></ErrorBoundary>} />
              <Route path="/ai"                 element={<ErrorBoundary><AIAssistantPage /></ErrorBoundary>} />
              <Route path="/analytics"          element={<ErrorBoundary><AnalyticsPage /></ErrorBoundary>} />
              <Route path="/settings"           element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

`ProtectedRoute` checks `isAuthenticated` and redirects to `/login?redirect=<path>` when false. The `Layout` component is the parent of all protected routes and renders `<Outlet />` in its `<main>` area, so the sidebar persists across protected route changes.

---

## TailwindCSS Theme Extension

`frontend/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9ccff',
          300: '#8aa4f7',
          400: '#617de8',
          500: '#4259d4',
          600: '#3347ba',
          700: '#2a3896',
          800: '#1e2a78',
          900: '#151e5e',
          950: '#0f172a',  // primary sidebar/header background
        },
        teal: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // primary interactive accent
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      transitionDuration: {
        '150': '150ms',
        '250': '250ms',
        '300': '300ms',
      },
    },
  },
  plugins: [],
};

export default config;
```

All color tokens are defined here so changing a brand color requires editing only this file. The `dark` class strategy is used (controlled by `applyTheme()` in `uiStore.ts`).

---

## API Client Design

`src/lib/apiClient.ts`

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL ?? (() => {
  if (import.meta.env.DEV) {
    console.warn('[apiClient] VITE_API_URL not set, falling back to http://localhost:5001');
  }
  return 'http://localhost:5001';
})();

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// --- Request interceptor: inject JWT ---
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: token refresh + error handling ---
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const flushQueue = (err: unknown, token?: string) => {
  refreshQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401: attempt token refresh
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        isRefreshing = false;
        useAuthStore.getState().clearAuth();
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
        // Update store (refreshToken stays the same)
        const { user, refreshToken: rt } = useAuthStore.getState();
        useAuthStore.getState().setAuth(newToken, rt!, user!);
        original.headers.Authorization = `Bearer ${newToken}`;
        flushQueue(null, newToken);
        return apiClient(original);
      } catch (refreshError) {
        flushQueue(refreshError);
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 429: parse Retry-After header
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const enrichedError = Object.assign(error, {
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
      });
      return Promise.reject(enrichedError);
    }

    // Production: suppress request/response body logging
    if (!import.meta.env.PROD) {
      console.error('[apiClient]', error.response?.status, error.config?.url, error.message);
    }

    return Promise.reject(error);
  },
);
```

Design decisions:
- `useAuthStore.getState()` (non-reactive read) is used in interceptors because interceptors are not React components
- The refresh queue pattern prevents multiple concurrent 401s from triggering multiple refresh calls (existing pattern from `src/api/client.js`, preserved and typed)
- Token is read from the store (not directly from localStorage) so any in-memory update is immediately reflected
- Production log suppression is enforced by `import.meta.env.PROD` rather than a runtime switch

---

## React Query Hooks Design

`src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,   // 30 seconds
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### Query Keys Convention

All query keys are defined in a central `queryKeys` object to prevent key typos:

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  currentUser:      ['currentUser']              as const,
  analytics:        ['analytics']                as const,
  conversations:    ['conversations']            as const,
  messages:         (id: string) => ['messages', id] as const,
  notifications:    ['notifications']            as const,
};
```

### Custom Query Hooks (`src/hooks/`)

```typescript
// useAnalytics — fetches /api/v1/analytics with 60s cache
export function useAnalytics() {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn:  () => apiClient.get<AnalyticsPayload>('/analytics').then((r) => r.data),
    staleTime: 60_000,   // overrides default 30s for analytics
    retry: 2,
  });
}

// useConversations — fetches /api/v1/conversations
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn:  () => apiClient.get<Conversation[]>('/conversations').then((r) => r.data),
  });
}

// useMessages — fetches paginated messages for a conversation
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn:  () =>
      apiClient
        .get<PaginatedMessages>(`/conversations/${conversationId}/messages`)
        .then((r) => r.data),
    enabled: Boolean(conversationId),
  });
}

// useNotifications — fetches unread notifications
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn:  () => apiClient.get<Notification[]>('/notifications').then((r) => r.data),
  });
}

// useCurrentUser — fetches /api/v1/users/me
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn:  () => apiClient.get<User>('/users/me').then((r) => r.data),
  });
}
```

### Socket.IO Cache Integration

The `useSocket` hook (at `src/hooks/useSocket.ts`, which already exists) will be extended to call `queryClient.setQueryData` on incoming `new_message` events:

```typescript
socket.on('new_message', (message: Message) => {
  // Update React Query cache directly
  queryClient.setQueryData<PaginatedMessages>(
    queryKeys.messages(message.conversation_id),
    (old) => old
      ? { ...old, messages: [...old.messages, message] }
      : undefined,
  );
  // Mirror to Chat_Store for badge count
  useChatStore.getState().addMessage(message.conversation_id, message);
});
```

### Mutation Hooks

```typescript
// useSendMessage — POST /api/v1/messages/send, invalidates messages query
export function useSendMessage() {
  return useMutation({
    mutationFn: (payload: { conversation_id: string; text: string }) =>
      apiClient.post<Message>('/messages/send', payload).then((r) => r.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(variables.conversation_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

// useUpdateProfile — PATCH /api/v1/users/me, updates Auth_Store and cache
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload: ProfileFormValues) =>
      apiClient.patch<User>('/users/me', payload).then((r) => r.data),
    onSuccess: (user) => {
      useAuthStore.getState().setUser(user);
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
}
```

---

## Dashboard Page Design

`src/features/dashboard/DashboardPage.tsx`

The dashboard page renders:
1. A `<div className="relative overflow-hidden">` container holding the background SVG doodles and the metric cards grid
2. Four `<MetricCard>` components or four `<MetricCardSkeleton>` components based on `useAnalytics` state
3. A brief welcome message with the user's first name from `Auth_Store.user`

```tsx
const METRIC_CARDS_CONFIG = [
  {
    key:   'active_users',
    label: 'Total Users',
    icon:  UsersIcon,
    decorativeIcon: CircleAccentSvg,
    gradientClassName: 'from-navy-900 to-navy-800',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key:   'message_volume',
    label: 'Messages Sent',
    icon:  ChatBubbleIcon,
    decorativeIcon: WaveAccentSvg,
    gradientClassName: 'from-navy-950 to-navy-900',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key:   'smart_reply_requests',   // from ai_insights
    label: 'AI Feature Usage',
    icon:  SparklesIcon,
    decorativeIcon: DotAccentSvg,
    gradientClassName: 'from-teal-900 to-navy-900',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key:   'response_time_ms',
    label: 'Avg AI Response',
    icon:  ClockIcon,
    decorativeIcon: CornerAccentSvg,
    gradientClassName: 'from-navy-800 to-navy-950',
    format: (v: number) => `${Math.round(v)}ms`,
  },
];
```

Loading state renders `<MetricCardSkeleton />` × 4. Error state renders each card with value `"—"` and triggers a toast via `useToast().error(message)` in a `useEffect` watching the error state.

---

## Custom Hooks Design

### `useAuth` (`src/hooks/useAuth.ts`)

```typescript
/**
 * Convenience hook that reads Auth_Store and provides typed login/logout helpers.
 * @returns auth state and helper functions
 */
export function useAuth() {
  const { token, user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    setAuth(data.access_token, data.refresh_token, data.user);
    queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
  }, [setAuth]);

  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* best-effort */ }
    clearAuth();
    queryClient.clear();
    navigate('/login');
  }, [clearAuth, navigate]);

  return { token, user, isAuthenticated, login, logout };
}
```

### `useTheme` (`src/hooks/useTheme.ts`)

```typescript
/**
 * Reads UI_Store theme and exposes the toggle.
 * @returns current theme and toggle function
 */
export function useTheme() {
  const { theme, toggleTheme } = useUIStore((s) => ({
    theme: s.theme,
    toggleTheme: s.toggleTheme,
  }));
  return { theme, toggleTheme, isDark: theme === 'dark' };
}
```

### `useToast` (`src/hooks/useToast.ts`)

```typescript
import toast from 'react-hot-toast';

/**
 * Typed wrapper around react-hot-toast with pre-configured durations and styles.
 */
export function useToast() {
  const success = (message: string) =>
    toast.success(message.slice(0, 80), {
      duration: 3000,
      style: { background: '#14b8a6', color: '#fff' },
    });

  const error = (message: string) =>
    toast.error(message.slice(0, 80), {
      duration: 5000,
      style: { background: '#ef4444', color: '#fff' },
    });

  const info = (message: string) =>
    toast(message.slice(0, 80), {
      duration: 4000,
      icon: 'ℹ️',
    });

  return { success, error, info };
}
```

Note: `.slice(0, 80)` enforces the ≤80 character requirement from Requirement 14.5 at the call site.

---

## Vite Configuration Update

`frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-router': ['react-router-dom'],
        },
      },
    },
  },
});
```

---
## Migration Strategy

### Phase 1 — TypeScript Setup (Non-Breaking)
1. Install TypeScript and `@types/react`, `@types/react-dom` as dev dependencies
2. Create `tsconfig.json` with strict mode targeting ES2020
3. Update `vite.config.js` → `vite.config.ts` with resolve extensions and manualChunks
4. Update `tailwind.config.js` → `tailwind.config.ts` with navy/teal theme extension
5. Create `src/types/index.ts` with all interface definitions
6. The existing `.jsx`/`.js` files continue to work; TypeScript checks only `.ts`/`.tsx` initially

### Phase 2 — Infrastructure Layer (Non-Breaking)
1. Create `src/lib/apiClient.ts` — new typed client replacing `src/api/client.js`; both coexist temporarily
2. Create `src/lib/queryClient.ts` and `src/lib/queryKeys.ts`
3. Create `src/store/authStore.ts`, `src/store/chatStore.ts`, `src/store/uiStore.ts`
4. Create `src/hooks/useAuth.ts`, `src/hooks/useTheme.ts`, `src/hooks/useToast.ts`
5. Create query hooks in `src/hooks/` (`useAnalytics`, `useConversations`, etc.)
6. Existing components still import `src/api/client.js` and `src/store/authSlice.js`

### Phase 3 — Layout Shell
1. Create `src/components/layout/ErrorBoundary.tsx`
2. Create `src/components/layout/ProtectedRoute.tsx`
3. Create `src/components/layout/Sidebar.tsx` (reads new UI_Store)
4. Create `src/components/layout/Header.tsx`
5. Create `src/components/layout/Layout.tsx`
6. Create `src/App.tsx` with React Router and QueryClientProvider, replacing `src/App.jsx`
7. `src/main.tsx` updated to import `App.tsx` instead of `App.jsx`

### Phase 4 — Dashboard and UI Components
1. Create `src/components/ui/Skeleton.tsx`, `Button.tsx`, `Badge.tsx`, `Avatar.tsx`
2. Create `src/components/dashboard/MetricCard.tsx`, `MetricCardSkeleton.tsx`
3. Create `src/assets/doodles/` SVG components
4. Create `src/features/dashboard/DashboardPage.tsx` (replaces the inline dashboard in old App.jsx)
5. Rename and migrate `src/components/analytics/AnalyticsDashboard.jsx` → `.tsx`

### Phase 5 — Auth Forms
1. Create `src/features/auth/schemas.ts` with Zod schemas
2. Create `src/features/auth/LoginPage.tsx` (replaces `src/Auth.jsx`)
3. Create `src/features/auth/RegisterPage.tsx`
4. Install `react-hook-form`, `zod`, `@hookform/resolvers`

### Phase 6 — Remaining Pages and Skeleton Screens
1. Create `src/features/chat/ChatPage.tsx` (wraps existing `src/Chat.jsx`)
2. Create `src/features/ai/AIAssistantPage.tsx`
3. Create `src/features/analytics/AnalyticsPage.tsx`
4. Create `src/features/settings/SettingsPage.tsx`
5. Create `src/components/dashboard/ConversationListSkeleton.tsx`, `MessageThreadSkeleton.tsx`

### Phase 7 — Cleanup
1. Remove `src/App.jsx`, `src/Auth.jsx`
2. Rename all remaining `.jsx` → `.tsx` and `.js` → `.ts`
3. Remove `src/api/client.js` (replaced by `src/lib/apiClient.ts`)
4. Remove `src/store/authSlice.js` (replaced by `src/store/authStore.ts`)
5. Run `tsc --noEmit` to verify zero type errors
6. Add ESLint and Prettier configuration files

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is a React UI application with TypeScript interfaces, Zustand stores, and React Query hooks. PBT applies to the pure logic layers: store state transitions, query cache behavior, router redirect logic, API client interceptor behavior, and form validation. UI layout and CSS are verified by snapshot and example-based tests.

The property-based testing library for this project is **fast-check** (TypeScript-native, works with Vitest/Jest).

### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified and resolved:

- Requirements 3.1 and 3.4 (Auth_Store initialization and setAuth invariant) can be combined into a single property: after calling `setAuth` with any valid data, `isAuthenticated` must be true and `token` must equal the provided token. This subsumes the localStorage initialization check.
- Requirements 5.5 and 5.7 (nav item click → route change, admin item visibility) are independent and non-redundant.
- Requirements 7.6 and 7.7 (analytics caching and retry) are independent — caching tests query staleness, retry tests HTTP attempt count.
- Requirements 11.2 and 11.3 (JWT injection and refresh flow) are independent — injection tests the request interceptor, refresh tests the response interceptor.
- Requirements 4.2 and 4.3 (protected route redirects) are logically parallel and cannot be merged: one covers unauthenticated → protected (redirect to login), the other covers authenticated → public auth pages (redirect to dashboard).

### Property 1: Auth_Store setAuth / clearAuth invariants

*For any* valid token string, refresh token string, and User object, calling `setAuth(token, refreshToken, user)` on the Auth_Store must result in `isAuthenticated === true`, `store.token === token`, and `store.user.id === user.id`. Subsequently calling `clearAuth()` must result in `isAuthenticated === false`, `store.token === null`, and `store.user === null`.

**Validates: Requirements 3.1, 3.4**

### Property 2: Chat_Store addMessage append invariant

*For any* Chat_Store state and any Message object with a valid `conversation_id`, calling `addMessage(conversationId, message)` must result in the message array for that conversation being exactly one element longer than before and the final element equaling the appended message.

**Validates: Requirements 3.2**

### Property 3: UI_Store toggleSidebar idempotence

*For any* initial `sidebarOpen` value, calling `toggleSidebar()` twice must return the sidebar to its original open state. The property holds regardless of how many times the toggle is called in sequence — two calls always restore the original value.

**Validates: Requirements 3.3**

### Property 4: UI_Store toggleTheme round-trip

*For any* initial theme value (`'light'` or `'dark'`), calling `toggleTheme()` twice must return the theme to its original value. After the first toggle, `document.documentElement.classList` must contain `'dark'` if and only if the new theme is `'dark'`.

**Validates: Requirements 3.3, 3.5**

### Property 5: Protected route redirect universality

*For any* path string in the set `{'/dashboard', '/chat', '/ai', '/analytics', '/settings'}`, rendering a `<ProtectedRoute>` with `isAuthenticated === false` must redirect to `/login` and the resulting location must include the original path as the `redirect` query parameter.

**Validates: Requirements 4.2**

### Property 6: Auth route redirect universality

*For any* path string in `{'/login', '/register'}`, rendering those page components with `isAuthenticated === true` must immediately navigate to `/dashboard` without rendering the form.

**Validates: Requirements 4.3**

### Property 7: Sidebar admin item visibility

*For any* User object, the Sidebar must render the "Admin Panel" navigation item if and only if `user.role === 'admin'`. For any non-admin role (`'user'`, `'moderator'`), the Admin Panel item must be absent from the rendered output.

**Validates: Requirements 5.7**

### Property 8: Sidebar user footer rendering

*For any* User object with a non-empty `name` and any `role` value, the Sidebar user footer must contain the user's display name and a badge displaying the role string.

**Validates: Requirements 5.6**

### Property 9: API client JWT injection

*For any* non-null token string stored in Auth_Store, every request dispatched through `apiClient` must include an `Authorization` header with the value `Bearer <token>`. For any null token, the `Authorization` header must be absent from the request.

**Validates: Requirements 11.2**

### Property 10: API client token refresh retry count

*For any* 401 response to an API request (excluding the refresh endpoint itself), the API client must call `POST /api/v1/auth/refresh` exactly once, update the Authorization header with the new token, and retry the original request exactly once. The total number of attempts for the original request URL must equal 2.

**Validates: Requirements 11.3**

### Property 11: Analytics cache prevents redundant fetches

*For any* time interval T where T < 60 seconds has elapsed since the last successful analytics fetch, calling `useAnalytics()` must return the previously cached data and must NOT dispatch a new network request to `/api/v1/analytics`.

**Validates: Requirements 7.6**

### Property 12: Analytics retry count on failure

*For any* analytics endpoint that responds with a non-2xx status on every attempt, the total number of network requests made before the error is surfaced to the component must equal 3 (1 original + 2 retries).

**Validates: Requirements 7.7**

### Property 13: useMessages socket cache update

*For any* incoming Socket.IO `new_message` event for conversation ID `X`, the React Query cache entry for `queryKeys.messages(X)` must include the new message in its `messages` array, and no new HTTP request to the messages endpoint must have been triggered.

**Validates: Requirements 12.5**

### Property 14: Mutation cache invalidation

*For any* successful `useSendMessage` mutation call for conversation ID `X`, the React Query cache entry for `queryKeys.messages(X)` must be marked stale (so the next render triggers a background refetch).

**Validates: Requirements 12.6**

### Property 15: Toast message length constraint

*For any* success, error, or info condition handled by `useToast`, the string passed to `react-hot-toast` must have a character length ≤ 80. This holds for any error message returned by the API (which may be of arbitrary length) because `useToast` truncates via `.slice(0, 80)`.

**Validates: Requirements 14.5**

### Property 16: SVG doodle accessibility attributes

*For any* SVG doodle component instance rendered in any theme or screen size, the root `<svg>` element must have `aria-hidden="true"` and `focusable="false"` attributes, ensuring the element is invisible to assistive technologies.

**Validates: Requirements 9.5**

### Property 17: SVG doodle opacity bounds

*For any* rendered Dashboard in light mode, all SVG doodle elements must have an effective opacity in the range `[0.04, 0.10]`. In dark mode the range must be `[0.06, 0.12]`.

**Validates: Requirements 9.2**

---

## Error Handling

### API Errors
- **Network timeout (>15s)**: Axios surfaces as `ECONNABORTED`. React Query catches it, retries up to 2 times with exponential backoff, then sets `isError = true`. The component renders an inline error card with a Retry button. `useToast().error()` is called once.
- **401 Unauthorized**: Handled by the API client interceptor — one token refresh attempt. If refresh fails, `clearAuth()` is called and the user is redirected to `/login` with a session-expired toast.
- **403 Forbidden**: Surfaced as a React Query error. Components render "You don't have permission" message. Not retried.
- **404 Not Found**: Surfaced as a React Query error. Components render appropriate fallback.
- **429 Too Many Requests**: Enriched with `retryAfter` property by the response interceptor. React Query will wait `retryAfter` seconds before the next retry attempt.
- **500 Server Error**: React Query retries 2 times then surfaces the error. Toast notification is shown.

### Form Errors
- Zod validation errors are mapped to field-level messages by `@hookform/resolvers/zod` and rendered by `react-hook-form`'s `formState.errors`. No toast is shown for validation errors to avoid duplicating the inline message.
- API errors from form submission (e.g., "Email already in use" on registration) are caught in the `onError` callback and displayed via `useToast().error()`.

### Runtime Errors
- JavaScript errors in component render trees are caught by `<ErrorBoundary>` wrappers. The error is logged to `console.error` in development. The fallback UI is shown.
- Errors in event handlers and async functions (outside React's render cycle) are not caught by ErrorBoundary and must be handled locally with try/catch + `useToast().error()`.

---

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)

Unit tests focus on specific examples, edge cases, and component behavior:

- **Store tests**: Test `setAuth`/`clearAuth` state transitions, `addMessage` append behavior, `toggleSidebar` and `toggleTheme` behavior with concrete examples
- **Component tests**: Render `<MetricCard>`, `<Skeleton>`, `<Sidebar>`, `<ErrorBoundary>` with mock props and verify DOM output
- **Hook tests**: Test `useAuth`, `useTheme`, `useToast` with mock stores using `renderHook`
- **Form tests**: Test Zod schemas directly with valid and invalid inputs; test form submission flow with mocked API calls

### Property-Based Tests (Vitest + fast-check)

Property-based tests validate the correctness properties listed above. Each property test runs a minimum of 100 iterations with randomized inputs generated by fast-check.

Key test patterns:
- **Zustand store invariants** (Properties 1–4): Use `fc.string()`, `fc.record()`, and `fc.constantFrom()` to generate random store inputs
- **Router redirect properties** (Properties 5–6): Use `fc.constantFrom()` over the protected/public path sets and `fc.boolean()` for auth state
- **API client properties** (Properties 9–10): Use `fc.string()` for tokens, mock Axios adapter to simulate 401 responses
- **Cache properties** (Properties 11–12): Use `fc.integer()` for time intervals, mock the query client and Axios adapter
- **Toast length property** (Property 15): Use `fc.string()` with varying lengths to verify truncation at 80 chars

Example test structure:

```typescript
// Property 1: Auth_Store setAuth invariant
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../store/authStore';

describe('Feature: dashboard-ui-enhancement, Property 1: Auth_Store setAuth / clearAuth invariants', () => {
  it('setAuth makes isAuthenticated true; clearAuth resets to null/false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10 }),
        fc.string({ minLength: 10 }),
        fc.record({
          id:         fc.uuid(),
          email:      fc.emailAddress(),
          name:       fc.string({ minLength: 2 }),
          role:       fc.constantFrom('user', 'moderator', 'admin'),
          avatar_url: fc.option(fc.webUrl(), { nil: null }),
          status:     fc.option(fc.string(), { nil: null }),
          bio:        fc.option(fc.string(), { nil: null }),
        }),
        (token, refreshToken, user) => {
          const { result } = renderHook(() => useAuthStore());
          act(() => result.current.setAuth(token, refreshToken, user as User));
          expect(result.current.isAuthenticated).toBe(true);
          expect(result.current.token).toBe(token);
          act(() => result.current.clearAuth());
          expect(result.current.isAuthenticated).toBe(false);
          expect(result.current.token).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

Tag format: `Feature: dashboard-ui-enhancement, Property {N}: {property_text}`

### Integration Tests

Integration tests verify the interaction between the API client and the backend:

- Auth flow: register → login → access protected endpoint → logout
- Analytics fetch: GET `/api/v1/analytics` with valid admin JWT returns expected shape
- Token refresh: expired token triggers refresh and retries the original request

These tests run against a local test database instance and are not part of the fast-check property suite.

### Snapshot Tests

Snapshot tests catch unintended visual regressions in stable components:

- `<MetricCard>` with all prop variants
- `<Skeleton>` with various width/height combinations
- `<ErrorBoundary>` fallback UI
- `<Sidebar>` in expanded and collapsed states
- SVG doodle components (`DotGrid`, `WaveCurve`, `CornerAccent`)

### Test Configuration

```typescript
// vite.config.ts — test block
test: {
  environment: 'jsdom',
  setupFiles:  ['./src/setupTests.ts'],
  globals:     true,
},
```

`src/setupTests.ts` will import `@testing-library/jest-dom` for custom matchers and mock `localStorage` with a simple in-memory implementation.

---

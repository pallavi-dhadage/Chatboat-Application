# Implementation Plan: Dashboard UI Enhancement

## Overview

Incrementally transform the ChatFlow AI frontend from a minimal JSX application into a
production-quality TypeScript SPA. Tasks follow the seven migration phases from the design
document: TypeScript setup → infrastructure layer → layout shell → dashboard & UI primitives
→ auth forms → remaining pages & skeletons → cleanup & quality. Each task builds on the
previous one; no step leaves orphaned code.

---

## Tasks

- [x] 1. TypeScript and tooling setup
  - Install `typescript`, `@types/react`, `@types/react-dom` as dev dependencies
  - Create `tsconfig.json` with `"strict": true` targeting ES2020, including all `src/**/*.ts` and `src/**/*.tsx` files
  - Rename `vite.config.js` → `vite.config.ts`; add `@vitejs/plugin-react` plugin, `resolve.extensions` for `.tsx/.ts/.jsx/.js`, `resolve.alias` `@` → `src/`, and `build.rollupOptions.output.manualChunks` for vendor-react, vendor-motion, vendor-query, vendor-router
  - Rename `tailwind.config.js` → `tailwind.config.ts`; add `darkMode: 'class'`, navy/teal color palette extension, shimmer keyframe, and transition duration tokens as specified in the design
  - Update `frontend/package.json` `scripts.build` to run `tsc --noEmit && vite build`
  - Add `eslint.config.js` extending `eslint:recommended`, `plugin:react/recommended`, `plugin:@typescript-eslint/recommended`, and `plugin:react-hooks/recommended`
  - Add `.prettierrc` with `printWidth: 100`, `singleQuote: true`, `trailingComma: 'all'`, `semi: true`
  - Verify `.gitignore` includes `.env.local` and `.env.production`
  - Update `.env.example` to list `VITE_API_URL` with a placeholder value and inline comment
  - _Requirements: 1.1, 1.6, 2.1, 2.2, 2.3, 18.2, 18.3, 19.3, 19.5, 20.1, 20.2_

- [x] 2. Shared TypeScript interfaces and folder scaffold
  - Create all directories: `src/types/`, `src/lib/`, `src/store/`, `src/hooks/`, `src/components/ui/`, `src/components/layout/`, `src/components/dashboard/`, `src/features/auth/`, `src/features/dashboard/`, `src/features/chat/`, `src/features/ai/`, `src/features/analytics/`, `src/features/settings/`, `src/assets/doodles/`
  - Create `src/types/index.ts` with all interfaces: `User`, `Conversation`, `Message`, `Notification`, `AnalyticsPayload`, `SentimentDataPoint`, `AIInsights`, `AISmartReplyResponse`, `AISentimentResponse`, `AuthResponse`, `PaginatedMessages`, `AuthState`, `ChatState`, `UIState`; add JSDoc to each exported interface and its fields
  - _Requirements: 1.3, 1.4, 2.4, 20.5_

- [x] 3. Zustand stores
  - [x] 3.1 Create `src/store/authStore.ts` implementing `AuthState` with `setAuth`, `clearAuth`, `setUser` actions; initialize from `localStorage` keys `cf_access_token`, `cf_refresh_token`, `cf_user` on mount
    - _Requirements: 3.1, 3.4_

  - [ ]* 3.2 Write property tests for Auth_Store setAuth / clearAuth invariants
    - **Property 1: Auth_Store setAuth / clearAuth invariants**
    - **Validates: Requirements 3.1, 3.4**
    - Use `fc.string()` for tokens and a custom `fc.record` arbitrary for User objects
    - Assert `isAuthenticated === true` and `store.token === token` after `setAuth`; assert `isAuthenticated === false` and `store.token === null` after `clearAuth`

  - [x] 3.3 Create `src/store/chatStore.ts` implementing `ChatState` with `setConversations`, `setActiveConversation`, `addMessage`, `setTypingUsers` actions
    - _Requirements: 3.2_

  - [ ]* 3.4 Write property test for Chat_Store addMessage append invariant
    - **Property 2: Chat_Store addMessage append invariant**
    - **Validates: Requirements 3.2**
    - For any initial messages state and any Message object, assert the array for that `conversationId` is exactly one element longer and its last element equals the appended message

  - [x] 3.5 Create `src/store/uiStore.ts` implementing `UIState` with `toggleSidebar`, `setSidebarOpen`, `setActiveView`, `toggleTheme` actions; call `applyTheme(savedTheme)` at module load to avoid flash of unstyled content
    - _Requirements: 3.3, 3.5_

  - [ ]* 3.6 Write property tests for UI_Store toggle invariants
    - **Property 3: UI_Store toggleSidebar idempotence**
    - **Validates: Requirements 3.3**
    - Two successive `toggleSidebar()` calls must restore the original `sidebarOpen` value
    - **Property 4: UI_Store toggleTheme round-trip**
    - **Validates: Requirements 3.3, 3.5**
    - Two successive `toggleTheme()` calls must restore the original theme; after the first call, `document.documentElement.classList.contains('dark')` must match the new theme

- [x] 4. API client and query infrastructure
  - [x] 4.1 Create `src/lib/apiClient.ts` as an Axios instance with `baseURL` from `VITE_API_URL` (dev-mode warning fallback to `http://localhost:5001`), JWT request interceptor reading `useAuthStore.getState().token`, 401 response interceptor with refresh-queue pattern and `clearAuth` + redirect on refresh failure, and 429 handler that parses `Retry-After` into a `retryAfter` field; suppress request/response body logging when `import.meta.env.PROD`
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 18.1, 18.4_

  - [ ]* 4.2 Write property tests for API client interceptors
    - **Property 9: API client JWT injection**
    - **Validates: Requirements 11.2**
    - For any non-null token, every request must include `Authorization: Bearer <token>`; for null token, header must be absent
    - **Property 10: API client token refresh retry count**
    - **Validates: Requirements 11.3**
    - For any 401 response (non-refresh endpoint), the client must call the refresh endpoint exactly once and retry the original request exactly once (total 2 attempts)
    - Use `msw` or an Axios adapter mock to intercept requests in tests

  - [x] 4.3 Create `src/lib/queryClient.ts` with `QueryClient` configured with `staleTime: 30_000`, `retry: 2`, exponential `retryDelay`, `refetchOnWindowFocus: true`; and `src/lib/queryKeys.ts` with the typed `queryKeys` constant
    - _Requirements: 12.1_

  - [x] 4.4 Create custom query hooks in `src/hooks/`: `useAnalytics` (60 s staleTime), `useConversations`, `useMessages(conversationId)`, `useNotifications`, `useCurrentUser`; also create `useSendMessage` and `useUpdateProfile` mutation hooks that invalidate the relevant query keys on success; add JSDoc to all hook return types
    - _Requirements: 12.2, 12.6, 20.5_

  - [ ]* 4.5 Write property tests for React Query cache behavior
    - **Property 11: Analytics cache prevents redundant fetches**
    - **Validates: Requirements 7.6**
    - Assert no new network request is dispatched when `useAnalytics` is called again within 60 s of a successful fetch
    - **Property 12: Analytics retry count on failure**
    - **Validates: Requirements 7.7**
    - Assert exactly 3 network requests (1 original + 2 retries) are made before the error surfaces when every response is non-2xx
    - **Property 14: Mutation cache invalidation**
    - **Validates: Requirements 12.6**
    - After a successful `useSendMessage` mutation, assert `queryKeys.messages(conversationId)` is marked stale

- [x] 5. Checkpoint — infrastructure compiles and store tests pass
  - Run `tsc --noEmit` from the `frontend/` directory and fix all reported type errors
  - Ensure all property and unit tests in tasks 3 and 4 pass
  - _Requirements: 1.5_

- [x] 6. Reusable UI primitives
  - [x] 6.1 Create `src/components/ui/Skeleton.tsx` accepting `width`, `height`, `rounded`, and `className` props; implement shimmer `@keyframes` in `src/index.css` cycling opacity over 1.5 s; add dark-mode variants cycling `bg-gray-700 → bg-gray-600`; export `FullPageSkeleton` as a full-viewport variant
    - _Requirements: 16.1, 16.6_

  - [x] 6.2 Create `src/components/ui/Button.tsx` with variant props (`primary`, `ghost`, `danger`), loading-spinner state, and disabled styling; apply `hover:scale-[1.02] hover:brightness-110 transition duration-150` per the design
    - _Requirements: 10.2_

  - [x] 6.3 Create `src/components/ui/Badge.tsx` for role labels (`user`, `moderator`, `admin`) with appropriate color mapping from the navy/teal palette; and `src/components/ui/Avatar.tsx` that renders an `<img>` when `avatar_url` is provided or a styled initials fallback div otherwise
    - _Requirements: 5.6, 8.2_

- [x] 7. SVG doodle components
  - Create `src/assets/doodles/DotGrid.tsx`, `WaveCurve.tsx`, and `CornerAccent.tsx` as inline `<svg>` React components; each must include `aria-hidden="true"`, `focusable="false"`, `pointer-events: none`, and use `currentColor` for fills; accept a `className` prop for opacity and color overrides
  - Set default opacity within the `[0.04, 0.10]` range for light mode; document dark-mode class override for `[0.06, 0.12]` range
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ]* 7.1 Write property tests for SVG doodle accessibility and opacity
    - **Property 16: SVG doodle accessibility attributes**
    - **Validates: Requirements 9.5**
    - For any rendered doodle component, assert `aria-hidden="true"` and `focusable="false"` are present on the root `<svg>` element
    - **Property 17: SVG doodle opacity bounds**
    - **Validates: Requirements 9.2**
    - In light mode assert effective opacity ∈ [0.04, 0.10]; in dark mode assert effective opacity ∈ [0.06, 0.12]

- [x] 8. Custom hooks
  - [x] 8.1 Create `src/hooks/useAuth.ts` reading `useAuthStore` and exposing typed `login(email, password)` and `logout()` helpers; `login` calls `POST /api/v1/auth/login`, calls `setAuth`, and invalidates `queryKeys.currentUser`; `logout` calls `POST /api/v1/auth/logout` (best-effort), calls `clearAuth`, clears QueryClient, and navigates to `/login`; add JSDoc
    - _Requirements: 20.4_

  - [x] 8.2 Create `src/hooks/useTheme.ts` reading `useUIStore` with a selector for `theme` and `toggleTheme`, returning `{ theme, toggleTheme, isDark }`; and `src/hooks/useToast.ts` wrapping `react-hot-toast` with typed `success`, `error`, and `info` helpers that enforce the ≤80-character constraint via `.slice(0, 80)`; add JSDoc to all return types
    - _Requirements: 14.5, 20.4, 20.5_

  - [ ]* 8.3 Write property test for toast message length constraint
    - **Property 15: Toast message length constraint**
    - **Validates: Requirements 14.5**
    - For any arbitrary-length string passed to `useToast().success/error/info`, the string ultimately passed to `react-hot-toast` must have length ≤ 80

- [x] 9. Layout shell components
  - [x] 9.1 Create `src/components/layout/ErrorBoundary.tsx` as a class component with `componentDidCatch`; log `error.message` and `errorInfo.componentStack` to `console.error` in development only; render a centered fallback card with ChatFlow AI logo, human-readable message, and a "Reload page" button calling `window.location.reload()`; accept an optional `fallback` prop
    - _Requirements: 15.1, 15.3, 15.4, 15.5_

  - [x] 9.2 Create `src/components/layout/ProtectedRoute.tsx` that reads `Auth_Store.isAuthenticated`; redirects to `/login?redirect=<current-path>` when false; renders `children` when true
    - _Requirements: 4.2_

  - [ ]* 9.3 Write property tests for route redirect logic
    - **Property 5: Protected route redirect universality**
    - **Validates: Requirements 4.2**
    - For each path in `{'/dashboard', '/chat', '/ai', '/analytics', '/settings'}`, rendering `<ProtectedRoute>` with `isAuthenticated === false` must redirect to `/login` with the original path as the `redirect` query parameter
    - **Property 6: Auth route redirect universality**
    - **Validates: Requirements 4.3**
    - For each of `{'/login', '/register'}`, rendering those pages with `isAuthenticated === true` must immediately navigate to `/dashboard`

  - [x] 9.4 Create `src/components/layout/Sidebar.tsx` with a Framer Motion `<motion.aside>` animating `width` between 240 px (expanded) and 64 px (collapsed) over 300 ms; render nav items from a static array of `NavItem` objects; fade out text labels on collapse while keeping icons visible; highlight active route with navy-700 background and teal left-border; render user footer with `<Avatar>`, display name, and `<Badge>`; conditionally render "Admin Panel" item for `user.role === 'admin'`; implement mobile overlay with `bg-black/40` backdrop that calls `setSidebarOpen(false)` when tapped
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.2, 6.3, 10.1_

  - [ ]* 9.5 Write property tests for Sidebar conditional rendering
    - **Property 7: Sidebar admin item visibility**
    - **Validates: Requirements 5.7**
    - For any User object with `role === 'admin'`, the "Admin Panel" nav item must be present; for `role === 'user'` or `'moderator'`, it must be absent
    - **Property 8: Sidebar user footer rendering**
    - **Validates: Requirements 5.6**
    - For any User object with a non-empty `name`, the footer must render the display name and a badge with the role string

  - [x] 9.6 Create `src/components/layout/Header.tsx` visible only on mobile (`block md:hidden`) with the ChatFlow AI wordmark, hamburger button toggling `UI_Store.sidebarOpen`, and current user avatar
    - _Requirements: 6.1_

  - [x] 9.7 Create `src/components/layout/Layout.tsx` rendering a two-column shell (Sidebar + `<main>` with `<Outlet />`); apply `margin-left` transition matching sidebar width change; hide Sidebar and show Header on viewports < 768 px; wrap each outlet-rendered child in `<ErrorBoundary>`
    - _Requirements: 5.1, 6.1, 15.2_

- [x] 10. App entry point with React Router v6
  - Rename `src/App.jsx` → `src/App.tsx` (or replace its content); wire `<QueryClientProvider>`, `<BrowserRouter>`, `<Toaster position="top-right" toastOptions={{ duration: 3000 }} />`, `<Suspense fallback={<FullPageSkeleton />}>`
  - Define all routes: `/login`, `/register`, `/` → `<Navigate to="/dashboard" replace />`, and nested protected routes under `<ProtectedRoute><Layout /></ProtectedRoute>` for `/dashboard`, `/chat`, `/chat/:conversationId`, `/ai`, `/analytics`, `/settings`
  - Lazy-load all page components with `React.lazy`; each page is wrapped in `<ErrorBoundary>` inside the route element
  - Rename `src/main.jsx` → `src/main.tsx`; update import to `App.tsx`
  - Initialize `react-hot-toast` `<Toaster>` with `containerStyle={{ zIndex: 9999 }}` and `max: 3`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 14.1, 15.2, 19.1_

- [x] 11. Dashboard components
  - [x] 11.1 Create `src/components/dashboard/MetricCard.tsx` with the full `MetricCardProps` interface (`label`, `value`, `trend`, `icon`, `decorativeIcon`, `gradientClassName`); apply Framer Motion `whileHover={{ scale: 1.03 }}` and `transition-shadow duration-150 hover:shadow-xl`; render linear gradient background, functional icon, and decorative SVG accent in the top-right corner
    - _Requirements: 7.1, 7.5, 9.4, 10.3_

  - [x] 11.2 Create `src/components/dashboard/MetricCardSkeleton.tsx` composed of four `<Skeleton>` blocks matching MetricCard layout (icon area, title, value, trend label); create `src/components/dashboard/ConversationListSkeleton.tsx` with five rows of circular avatar + name + preview skeletons; create `src/components/dashboard/MessageThreadSkeleton.tsx` with alternating left/right aligned message bubble skeletons
    - _Requirements: 16.2, 16.3, 16.4_

  - [x] 11.3 Create `src/features/dashboard/DashboardPage.tsx`; use `useAnalytics` hook, render four `<MetricCard>` components populated from `METRIC_CARDS_CONFIG` or four `<MetricCardSkeleton>` while loading; render error fallback with `"—"` values and fire a toast on error in a `useEffect`; render welcome message with first name from `Auth_Store.user`; place `<DotGrid>`, `<WaveCurve>` in the background layer with `absolute` positioning, `pointer-events-none`, and opacity in the required range; apply responsive grid (1 col < 640 px, 2 col 640–1024 px, 4 col ≥ 1024 px)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 6.5, 9.1, 9.2_

- [x] 12. Auth forms with Zod validation
  - [x] 12.1 Create `src/features/auth/schemas.ts` with `loginSchema`, `registerSchema`, and `profileSchema` Zod schemas plus their inferred TypeScript types (`LoginFormValues`, `RegisterFormValues`, `ProfileFormValues`) as specified in the design
    - _Requirements: 13.1, 13.2, 17.1_

  - [x] 12.2 Create `src/features/auth/LoginPage.tsx` using `react-hook-form` with `zodResolver(loginSchema)`; render email and password fields; show inline error messages on blur or submit within 50 ms; on valid submit call `useAuth().login`, store tokens via `setAuth`, redirect to `/dashboard`; on API error show a toast and re-enable the submit button; disable submit button and show loading spinner during submission; redirect to `/dashboard` if already authenticated
    - _Requirements: 13.1, 13.3, 13.4, 13.6, 13.7_

  - [x] 12.3 Create `src/features/auth/RegisterPage.tsx` using `react-hook-form` with `zodResolver(registerSchema)`; render name, email, password, confirmPassword fields; on valid submit call `POST /api/v1/auth/register` then auto-login via `POST /api/v1/auth/login`, store tokens, redirect to `/dashboard`; same loading-spinner and error-toast pattern as LoginPage; redirect to `/dashboard` if already authenticated
    - _Requirements: 13.2, 13.3, 13.5, 13.6, 13.7_

- [x] 13. Checkpoint — dashboard and auth pages render end-to-end
  - Run `tsc --noEmit` and ensure zero type errors
  - Run the full test suite and ensure all property and unit tests pass
  - _Requirements: 1.5_

- [x] 14. Remaining page stubs wired to existing components
  - [x] 14.1 Create `src/features/chat/ChatPage.tsx`; read `conversationId` from route params; use `useConversations` and `useMessages` hooks; render `<ConversationListSkeleton>` or `<MessageThreadSkeleton>` while loading; call `queryClient.setQueryData` from the existing `useSocket` hook on `new_message` events to update the cache without a full refetch; wrap existing chat sub-components (`ConversationList`, `MessageThread`, `MessageInput`, etc.) from `src/components/chat/`; apply Framer Motion fade-in slide-up on new message render
    - _Requirements: 10.4, 10.5, 12.3, 12.4, 12.5, 16.3, 16.4_

  - [ ]* 14.2 Write property test for socket cache update
    - **Property 13: useMessages socket cache update**
    - **Validates: Requirements 12.5**
    - For any incoming `new_message` socket event for conversation ID X, assert the React Query cache entry for `queryKeys.messages(X)` includes the new message and that no new HTTP request to the messages endpoint was triggered

  - [x] 14.3 Create `src/features/ai/AIAssistantPage.tsx` wrapping the existing `<AIAssistant>` component from `src/components/ai/`; add `<ErrorBoundary>` guard; add skeleton loading state
    - _Requirements: 15.2_

  - [x] 14.4 Create `src/features/analytics/AnalyticsPage.tsx` wrapping the existing `<AnalyticsDashboard>` component from `src/components/analytics/`; use `useAnalytics` hook; render `<MetricCardSkeleton>` while loading; render retry button on error
    - _Requirements: 12.3, 12.4_

- [x] 15. Settings page
  - Create `src/features/settings/SettingsPage.tsx` with three sections:
    - Profile form: pre-populated from `Auth_Store.user`, validated with `zodResolver(profileSchema)` via `react-hook-form`; on submit call `useUpdateProfile` mutation, update Auth_Store with response, show success toast
    - Theme toggle: renders a light/dark toggle control calling `useTheme().toggleTheme`
    - Account section: displays user email (read-only), role badge, and account creation date
    - Danger Zone: "Log Out" button that calls `useAuth().logout`, clears localStorage, redirects to `/login`
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 16. Cleanup and TypeScript migration completion
  - [x] 16.1 Rename all remaining `.jsx` source files to `.tsx` and all `.js` files in `src/` to `.ts`; update all imports accordingly; remove `src/App.jsx` and `src/Auth.jsx` if they still exist as separate files; remove `src/api/client.js` (replaced by `src/lib/apiClient.ts`); remove `src/store/authSlice.js` (replaced by `src/store/authStore.ts`)
    - _Requirements: 1.2_

  - [x] 16.2 Run `tsc --noEmit`; fix all remaining type errors in migrated `.tsx` files, paying particular attention to existing component files under `src/components/chat/`, `src/components/ai/`, `src/components/analytics/`, and `src/hooks/useSocket.ts`
    - _Requirements: 1.5_

  - [x] 16.3 Add `React.memo` wrappers to pure presentational components (`MetricCard`, `Skeleton`, `Badge`, `Avatar`, `MessageBubble`); add `useMemo` for derived computations in `DashboardPage` and `ChatPage`; verify Vite production build completes without errors and produces hashed filenames in `dist/`
    - _Requirements: 19.2, 19.4, 19.5_

- [x] 17. Final checkpoint — full quality pass
  - Run `tsc --noEmit` from `frontend/` — must report zero errors
  - Run ESLint against `src/` — must report zero errors
  - Run the full test suite — all tests must pass (property tests included)
  - Ensure the production build (`vite build`) completes and generates a `dist/` folder with hashed assets
  - _Requirements: 1.5, 20.3_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all other tasks are required
- Property tests use **fast-check** (already listed as a dev dependency); run them with `vitest --run` for single execution
- Each task references the specific acceptance criteria it satisfies for full traceability
- The Flask backend at `localhost:5001` is not modified by any task in this plan
- Existing files under `src/components/` are preserved and progressively wrapped — nothing is deleted until Task 16
- Checkpoints (Tasks 5, 13, 17) are go/no-go gates: fix all type and test errors before proceeding

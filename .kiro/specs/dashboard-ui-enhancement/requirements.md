# Requirements Document

## Introduction

This document specifies requirements for the Dashboard & UI Enhancement of the AI-Powered Real-Time Chat Platform (ChatFlow AI). The enhancement transforms the existing minimal React JSX frontend into a modern, professional TypeScript application with a collapsible sidebar layout, animated dashboard metrics, decorative visual elements, robust state management, API data-fetching with caching, form validation, and industry-standard frontend patterns including error boundaries, skeleton screens, toast notifications, and performance optimizations.

The platform already has a working Flask + SQLite backend (`local_server.py` on port 5001) with JWT authentication, real-time Socket.IO messaging, Groq AI features, and analytics endpoints. This enhancement focuses exclusively on the frontend layer and the integration patterns that connect it to that existing backend.

---

## Glossary

- **Dashboard**: The main landing view shown to authenticated users, containing metric cards, decorative elements, and quick-navigation links.
- **Sidebar**: The collapsible slide-out navigation panel containing links to Chat, AI Assistant, Analytics, and Settings views.
- **Metric_Card**: A dashboard UI component that displays a single KPI such as total users, message count, AI usage, or average response time.
- **Toast**: A transient, auto-dismissing notification overlay used to provide user feedback for actions such as successful login, message send errors, or copy operations.
- **Skeleton_Screen**: A placeholder UI that mimics the shape of real content and is shown while data is being fetched.
- **Error_Boundary**: A React component that catches JavaScript errors in its child component tree and renders a fallback UI instead of crashing the entire application.
- **Auth_Store**: The Zustand store slice responsible for holding and updating authentication state (JWT token, current user object, role).
- **Chat_Store**: The Zustand store slice responsible for holding conversations, messages, and real-time socket state.
- **UI_Store**: The Zustand store slice responsible for holding transient UI state such as sidebar open/closed, active view, and theme preference.
- **API_Client**: The Axios instance pre-configured with the base URL, JWT authorization header injection, and response error interceptors.
- **Query_Layer**: The React Query (TanStack Query) data-fetching and caching layer that wraps all REST API calls.
- **Router**: The React Router v6 declarative routing configuration that maps URL paths to view components.
- **Form_Validator**: The combination of React Hook Form and Zod used for client-side form schema definition, validation, and error rendering.
- **Theme**: The visual mode of the application — either `light` or `dark` — stored in `localStorage` and applied via a Tailwind CSS `dark` class on the root element.
- **SVG_Doodle**: A decorative, non-interactive SVG graphic used as a background or card accent to add visual depth without affecting content legibility.
- **Hamburger_Menu**: The mobile navigation toggle button shown on viewports narrower than 768 px that opens and closes the Sidebar.
- **Code_Splitting**: The Vite/React lazy-loading technique that splits view components into separate JS chunks loaded on demand to reduce initial bundle size.
- **Frontend**: The React 18 + TypeScript single-page application served by Vite.
- **Backend**: The Flask local development server (`local_server.py`) running on port 5001.

---

## Requirements

### Requirement 1: TypeScript Migration

**User Story:** As a developer, I want the frontend codebase migrated from JSX to TSX with proper TypeScript configuration, so that type errors are caught at compile time and the codebase is maintainable at scale.

#### Acceptance Criteria

1. THE Frontend SHALL be configured with a `tsconfig.json` that enables strict mode (`"strict": true`) and targets ES2020 or later.
2. THE Frontend SHALL rename all `.jsx` source files to `.tsx` and all `.js` source files to `.ts`, updating imports accordingly.
3. THE Frontend SHALL define TypeScript interfaces for all API response shapes: `User`, `Conversation`, `Message`, `Notification`, `AnalyticsPayload`, `AISmartReplyResponse`, and `AISentimentResponse`.
4. THE Frontend SHALL define TypeScript interfaces for all Zustand store slices: `AuthState`, `ChatState`, and `UIState`.
5. WHEN the TypeScript compiler runs (`tsc --noEmit`), THE Frontend SHALL produce zero type errors across all source files.
6. THE Frontend SHALL configure Vite to use the `@vitejs/plugin-react` plugin and resolve `.tsx` and `.ts` extensions without requiring explicit extension suffixes in import statements.

---

### Requirement 2: Dependency Installation and Folder Architecture

**User Story:** As a developer, I want the required libraries installed and a consistent component-based folder architecture in place, so that all subsequent features have a solid foundation to build on.

#### Acceptance Criteria

1. THE Frontend SHALL add the following production dependencies: `zustand`, `@tanstack/react-query`, `react-router-dom`, `react-hook-form`, `zod`, `@hookform/resolvers`, `framer-motion`, `react-hot-toast`, and `axios`.
2. THE Frontend SHALL add the following development dependencies: `typescript`, `@types/react`, `@types/react-dom`.
3. THE Frontend's `package.json` SHALL pin all new dependencies to exact or tilde-compatible versions to ensure reproducible builds.
4. THE Frontend SHALL organize source files under `src/` using the following structure: `components/ui/` for reusable primitives, `components/layout/` for layout components (Sidebar, Header, Layout), `components/dashboard/` for dashboard-specific components, `features/` for view-level feature folders (chat, ai, analytics, settings, auth), `hooks/` for custom React hooks, `store/` for Zustand slices, `lib/` for API client and utility functions, `types/` for shared TypeScript interfaces, and `assets/` for static SVG and image files.
5. THE Frontend SHALL configure TailwindCSS with a custom theme extension that defines a `navy` color palette as the primary color scale and a `teal` color palette as the secondary color scale, usable as Tailwind utility classes.

---

### Requirement 3: State Management with Zustand

**User Story:** As a developer, I want a centralized Zustand store managing auth, chat, and UI state, so that components can read and update shared state without prop drilling.

#### Acceptance Criteria

1. THE Auth_Store SHALL hold: `token` (string or null), `refreshToken` (string or null), `user` (User or null), and `isAuthenticated` (boolean), and SHALL expose `setAuth`, `clearAuth`, and `setUser` actions.
2. THE Chat_Store SHALL hold: `conversations` (Conversation array), `activeConversationId` (string or null), `messages` (record of conversation ID to Message array), and `typingUsers` (record of conversation ID to string array), and SHALL expose `setConversations`, `setActiveConversation`, `addMessage`, and `setTypingUsers` actions.
3. THE UI_Store SHALL hold: `sidebarOpen` (boolean), `activeView` (string), `theme` ('light' | 'dark'), and SHALL expose `toggleSidebar`, `setSidebarOpen`, `setActiveView`, and `toggleTheme` actions.
4. WHEN the application mounts, THE Auth_Store SHALL initialize `token` and `user` by reading from `localStorage` so that authenticated sessions persist across page reloads.
5. WHEN `toggleTheme` is called, THE UI_Store SHALL update `theme`, persist the new value to `localStorage`, and toggle the `dark` class on `document.documentElement`.
6. THE Frontend SHALL subscribe each component only to the store slice it needs, using selector functions, to minimize unnecessary re-renders.

---

### Requirement 4: React Router Navigation

**User Story:** As a user, I want the application URL to reflect my current view, so that I can use browser back/forward navigation and share deep links to specific sections.

#### Acceptance Criteria

1. THE Router SHALL define the following routes: `/login` → LoginPage, `/register` → RegisterPage, `/` → redirect to `/dashboard`, `/dashboard` → DashboardPage, `/chat` → ChatPage, `/chat/:conversationId` → ChatPage with active conversation, `/ai` → AIAssistantPage, `/analytics` → AnalyticsPage, and `/settings` → SettingsPage.
2. WHEN an unauthenticated user navigates to any protected route (`/dashboard`, `/chat`, `/ai`, `/analytics`, `/settings`), THE Router SHALL redirect the user to `/login` and preserve the originally requested path as a `redirect` query parameter.
3. WHEN an authenticated user navigates to `/login` or `/register`, THE Router SHALL redirect the user to `/dashboard`.
4. THE Frontend SHALL implement route-based code splitting using `React.lazy` and `Suspense` so that each page component is loaded as a separate JS chunk on demand.
5. WHEN a lazy-loaded route chunk is loading, THE Frontend SHALL render a full-page Skeleton_Screen as the Suspense fallback.

---

### Requirement 5: Dashboard Layout with Collapsible Sidebar

**User Story:** As a user, I want a professional dashboard layout with a collapsible sidebar, so that I can navigate between views efficiently and maximize screen space when needed.

#### Acceptance Criteria

1. THE Dashboard SHALL render a two-column layout consisting of a Sidebar on the left and a main content area on the right, with the Sidebar width transitioning between 240 px (expanded) and 64 px (collapsed) using a CSS or Framer Motion transition of no more than 300 ms.
2. THE Sidebar SHALL contain navigation items for: Dashboard, Chat, AI Assistant, Analytics, and Settings — each displaying an icon and a text label, with the label hidden when the Sidebar is in the collapsed state.
3. WHEN a user clicks the collapse toggle button, THE UI_Store SHALL update `sidebarOpen` and THE Sidebar SHALL animate between expanded and collapsed states.
4. THE Sidebar SHALL highlight the currently active navigation item using a distinct background color from the navy palette and a left-border accent in the teal palette.
5. WHEN a navigation item is clicked, THE Router SHALL navigate to the corresponding route and THE UI_Store SHALL update `activeView`.
6. THE Sidebar SHALL display the current user's avatar (or initials fallback), display name, and role badge at the bottom of the navigation list.
7. IF the authenticated user has the `admin` role, THEN THE Sidebar SHALL render an additional "Admin Panel" navigation item.

---

### Requirement 6: Mobile Responsive Layout

**User Story:** As a user on a mobile device, I want the layout to adapt to smaller screens with a hamburger menu, so that I can access all features without a degraded experience.

#### Acceptance Criteria

1. WHILE the viewport width is less than 768 px, THE Dashboard SHALL hide the Sidebar and render a fixed top Header bar containing the application logo and a Hamburger_Menu icon button.
2. WHEN a user taps the Hamburger_Menu button on a mobile viewport, THE Sidebar SHALL slide in from the left as a fixed-position overlay with a semi-transparent backdrop, animated with a slide-in duration of no more than 250 ms.
3. WHEN a user taps outside the Sidebar overlay or selects a navigation item on a mobile viewport, THE Sidebar SHALL slide out and the backdrop SHALL fade out.
4. THE Frontend SHALL use TailwindCSS responsive prefixes (`sm:`, `md:`, `lg:`) for all breakpoint-specific layout styles.
5. THE Metric_Cards in the Dashboard SHALL render in a one-column layout on viewports narrower than 640 px, a two-column grid between 640 px and 1024 px, and a four-column grid on viewports 1024 px and wider.
6. THE Frontend SHALL be visually consistent and fully functional on viewport widths from 320 px to 2560 px.

---

### Requirement 7: Dashboard Metric Cards

**User Story:** As an authenticated user, I want to see live platform metrics on the dashboard, so that I can understand platform activity at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL render exactly four Metric_Cards displaying: total registered users, total messages sent, AI feature usage count, and average AI response time in milliseconds.
2. WHEN the Dashboard mounts, THE Query_Layer SHALL fetch metrics from `GET /api/v1/analytics` and populate the four Metric_Cards with the returned values.
3. WHEN the analytics fetch is in progress, THE Dashboard SHALL render four Skeleton_Screen placeholders in place of the Metric_Cards.
4. IF the analytics fetch fails, THEN THE Dashboard SHALL render each Metric_Card with a fallback value of `—` and display a Toast with the error message.
5. WHEN a user hovers over a Metric_Card, THE Metric_Card SHALL apply a scale transform of 1.03 and an elevated box-shadow, transitioning over 150 ms.
6. THE Query_Layer SHALL cache the analytics response for 60 seconds and revalidate in the background on window focus, so that re-entering the Dashboard does not trigger a redundant network request within the cache window.
7. WHEN the analytics endpoint returns a non-2xx status, THE Query_Layer SHALL retry the request up to 2 times with exponential backoff before surfacing the error.

---

### Requirement 8: Visual Design — Color Scheme and Typography

**User Story:** As a user, I want a sophisticated color palette and consistent typography, so that the application looks and feels professional.

#### Acceptance Criteria

1. THE Frontend SHALL apply a deep navy/indigo color (`#0f172a` or equivalent) as the primary background color for the Sidebar and header in dark mode, and a light gray (`#f8fafc` or equivalent) in light mode.
2. THE Frontend SHALL apply a teal or emerald accent color (`#14b8a6` or equivalent) for interactive highlights, active navigation indicators, and primary call-to-action button backgrounds.
3. THE Frontend SHALL apply subtle linear gradients on Metric_Card backgrounds — transitioning from the card's base navy color to a slightly lighter shade — to add visual depth without overwhelming the content.
4. THE Frontend SHALL use a consistent type scale: page headings at `text-2xl font-bold`, section headings at `text-lg font-semibold`, body text at `text-sm`, and caption text at `text-xs text-gray-500`, applied via TailwindCSS utility classes.
5. THE Frontend SHALL define all color tokens in the TailwindCSS theme extension so that colors can be changed in a single configuration file without modifying individual component files.

---

### Requirement 9: Decorative SVG Doodles and Background Patterns

**User Story:** As a user, I want subtle decorative illustrations in the dashboard background, so that the interface feels visually rich without cluttering the functional content.

#### Acceptance Criteria

1. THE Dashboard SHALL render at least two SVG_Doodle elements in the background layer — such as geometric dot grids, abstract wave curves, or corner accent shapes — positioned using absolute CSS so they do not affect document flow or interactive hit areas.
2. THE SVG_Doodle elements SHALL have an opacity between 0.04 and 0.10 in light mode and between 0.06 and 0.12 in dark mode, ensuring they are visually subtle and do not reduce text contrast below WCAG AA ratios.
3. THE SVG_Doodle elements SHALL be inline SVG components (not `<img>` tags) so that their fill colors can respond to theme changes via CSS `currentColor` or TailwindCSS utility classes.
4. THE Metric_Cards SHALL each include a small decorative SVG icon or geometric accent in the card's top-right corner, visually distinct from the functional metric icon.
5. THE SVG_Doodle elements SHALL include `aria-hidden="true"` and `focusable="false"` attributes so that they are invisible to screen readers and keyboard navigation.

---

### Requirement 10: Hover Interactions and Micro-Animations

**User Story:** As a user, I want smooth hover effects on interactive elements throughout the application, so that the interface feels responsive and polished.

#### Acceptance Criteria

1. WHEN a user hovers over any navigation item in the Sidebar, THE Sidebar SHALL apply a background color transition from transparent to a navy-700 tint over 150 ms.
2. WHEN a user hovers over any primary button, THE Frontend SHALL apply a scale transform of 1.02 and a brightness increase of 10%, transitioning over 150 ms.
3. WHEN a user hovers over a Metric_Card, THE Metric_Card SHALL elevate its box-shadow from `shadow-md` to `shadow-xl` and scale to 1.03, transitioning over 150 ms using a CSS `transition` property.
4. WHEN a user hovers over a conversation list item in the Chat view, THE Frontend SHALL apply a left-border accent highlight in the teal palette and a background tint, transitioning over 150 ms.
5. WHEN a new message is rendered in the Chat view, THE Frontend SHALL animate the message card using a Framer Motion fade-in and slide-up transition with a duration of no more than 300 ms.
6. THE Frontend SHALL apply all hover and focus transitions using TailwindCSS `transition`, `duration-150`, `ease-in-out`, and `hover:` utility classes, or via Framer Motion, rather than inline style objects.

---

### Requirement 11: API Client and Error Handling

**User Story:** As a developer, I want a centralized Axios API client with automatic JWT injection and error handling, so that all API calls share consistent behavior without per-component boilerplate.

#### Acceptance Criteria

1. THE API_Client SHALL be an Axios instance configured with `baseURL` set to the value of the `VITE_API_URL` environment variable, defaulting to `http://localhost:5001`.
2. THE API_Client SHALL attach a `Authorization: Bearer <token>` header to every request by reading the current token from the Auth_Store in a request interceptor.
3. WHEN the API_Client receives a 401 response, THE API_Client SHALL call the `POST /api/v1/auth/refresh` endpoint using the stored refresh token, update the Auth_Store with the new access token, and retry the original request exactly once.
4. IF the token refresh also returns a 401 or fails, THEN THE API_Client SHALL call `clearAuth` on the Auth_Store and redirect the user to `/login`.
5. WHEN the API_Client receives a 429 response, THE API_Client SHALL surface the error to the Query_Layer as a structured error with a `retryAfter` property parsed from the `Retry-After` response header.
6. THE API_Client SHALL not log request or response bodies to the browser console in production builds (when `import.meta.env.PROD` is `true`).

---

### Requirement 12: Data Fetching and Caching with React Query

**User Story:** As a developer, I want React Query managing all server state, so that caching, background revalidation, loading states, and error states are handled consistently across the application.

#### Acceptance Criteria

1. THE Frontend SHALL wrap the application in a `QueryClientProvider` with a `QueryClient` configured with `staleTime` of 30 seconds and `retry` set to 2.
2. THE Query_Layer SHALL expose custom hooks for each data domain: `useAnalytics`, `useConversations`, `useMessages(conversationId)`, `useNotifications`, and `useCurrentUser`, each encapsulating the corresponding API_Client call and query key.
3. WHEN a query is in the `loading` state, THE corresponding view component SHALL render a Skeleton_Screen in place of the data.
4. WHEN a query transitions to the `error` state, THE corresponding view component SHALL render an inline error message and a "Retry" button that calls the query's `refetch` function.
5. WHEN the `useMessages` hook receives a new message via Socket.IO, THE Query_Layer SHALL update the cached message list for that conversation using `queryClient.setQueryData` so that the UI updates without a full refetch.
6. WHEN a mutation (send message, update profile) succeeds, THE Query_Layer SHALL invalidate the related query key so that fresh data is fetched on the next render cycle.

---

### Requirement 13: Authentication Forms with Validation

**User Story:** As a user, I want validated login and registration forms with clear error messages, so that I can create an account and sign in without confusion.

#### Acceptance Criteria

1. THE LoginPage SHALL render a form with fields for `email` and `password`, validated by a Zod schema requiring a valid email format and a non-empty password.
2. THE RegisterPage SHALL render a form with fields for `name`, `email`, `password`, and `confirmPassword`, validated by a Zod schema requiring: name between 2 and 100 characters, valid email format, password of at least 6 characters, and `confirmPassword` matching `password`.
3. WHEN a form field fails validation on blur or on submit, THE Form_Validator SHALL render an inline error message directly below the failing field within 50 ms of the validation event.
4. WHEN the login form is submitted with valid data, THE Frontend SHALL call `POST /api/v1/auth/login`, store the returned tokens in the Auth_Store and `localStorage`, and redirect to `/dashboard`.
5. WHEN the registration form is submitted with valid data, THE Frontend SHALL call `POST /api/v1/auth/register` and then automatically call `POST /api/v1/auth/login` with the same credentials, storing tokens and redirecting to `/dashboard`.
6. WHEN either form submission returns an API error, THE Frontend SHALL display a Toast with the error message and re-enable the submit button.
7. WHILE a form submission is in progress, THE Frontend SHALL disable the submit button and render a loading spinner inside it to prevent duplicate submissions.

---

### Requirement 14: Toast Notification System

**User Story:** As a user, I want brief, non-blocking feedback messages for my actions, so that I know whether an operation succeeded or failed without navigating away.

#### Acceptance Criteria

1. THE Frontend SHALL initialize `react-hot-toast` with a `Toaster` component mounted at the application root, configured to render toasts in the top-right corner with a maximum of 3 visible at a time.
2. WHEN an API mutation succeeds (message sent, profile updated, notification dismissed), THE Frontend SHALL display a success Toast with a green accent and an auto-dismiss delay of 3 seconds.
3. WHEN an API call fails with a network error or a non-2xx response, THE Frontend SHALL display an error Toast with a red accent and an auto-dismiss delay of 5 seconds.
4. WHEN an unauthenticated session is detected and the user is redirected to `/login`, THE Frontend SHALL display an informational Toast indicating the session has expired.
5. THE Toast messages SHALL be concise — no more than 80 characters — and SHALL NOT duplicate error text already displayed as inline form validation errors.

---

### Requirement 15: Error Boundaries

**User Story:** As a user, I want the application to recover gracefully from unexpected JavaScript errors in individual sections, so that a bug in one view does not crash the entire page.

#### Acceptance Criteria

1. THE Frontend SHALL implement a reusable `ErrorBoundary` class component that catches errors in its subtree and renders a fallback UI showing a friendly error message and a "Reload" button.
2. THE Frontend SHALL wrap each top-level page component (DashboardPage, ChatPage, AIAssistantPage, AnalyticsPage, SettingsPage) in a separate `ErrorBoundary` instance.
3. WHEN an `ErrorBoundary` catches an error, THE ErrorBoundary SHALL log the error and component stack to the browser console (in development) without surfacing raw stack traces to the end user.
4. THE fallback UI rendered by THE ErrorBoundary SHALL include the application logo, a human-readable error message, and a button that calls `window.location.reload()`.
5. THE ErrorBoundary SHALL not interfere with errors thrown in event handlers or asynchronous code outside React's render cycle, as those are handled by the Toast system.

---

### Requirement 16: Loading States and Skeleton Screens

**User Story:** As a user, I want placeholder loading states that match the shape of the real content, so that the interface feels fast and avoids layout shifts when data arrives.

#### Acceptance Criteria

1. THE Frontend SHALL implement a reusable `Skeleton` primitive component that renders an animated shimmer placeholder block with configurable width, height, and border-radius via props.
2. THE Frontend SHALL implement a `MetricCardSkeleton` composed of four `Skeleton` blocks matching the layout of a Metric_Card (icon area, title, value, and trend label).
3. THE Frontend SHALL implement a `ConversationListSkeleton` composed of five rows, each containing a circular `Skeleton` avatar, a `Skeleton` name line, and a `Skeleton` preview line.
4. THE Frontend SHALL implement a `MessageThreadSkeleton` composed of alternating left- and right-aligned `Skeleton` message bubbles of varying widths to simulate a conversation.
5. WHEN any data fetch transitions from loading to success, THE Frontend SHALL replace skeleton placeholders with real content without a layout shift greater than 0.1 CLS (Cumulative Layout Shift).
6. THE shimmer animation on all `Skeleton` components SHALL use a CSS `@keyframes` animation cycling from `bg-gray-200` to `bg-gray-300` (light mode) or `bg-gray-700` to `bg-gray-600` (dark mode) with a period of 1.5 seconds.

---

### Requirement 17: Settings Page and Profile Management

**User Story:** As a user, I want a Settings page where I can update my profile and toggle application preferences, so that I can personalize my experience.

#### Acceptance Criteria

1. THE SettingsPage SHALL render a profile form pre-populated with the current user's `name`, `status`, and `bio`, validated by a Zod schema requiring name between 2 and 100 characters.
2. WHEN the profile form is submitted with valid data, THE Frontend SHALL call `PATCH /api/v1/users/me`, update the Auth_Store's `user` field with the response, and display a success Toast.
3. THE SettingsPage SHALL render a theme toggle control (light/dark) that calls `toggleTheme` on the UI_Store when activated.
4. THE SettingsPage SHALL render an "Account" section displaying the user's email address (read-only), role badge, and account creation date.
5. THE SettingsPage SHALL render a "Danger Zone" section containing a "Log Out" button that calls `clearAuth` on the Auth_Store, clears `localStorage`, and redirects to `/login`.

---

### Requirement 18: Environment Variable Configuration

**User Story:** As a developer, I want all configurable values stored in environment variables, so that the application can be deployed to different environments without code changes.

#### Acceptance Criteria

1. THE Frontend SHALL read the backend API base URL exclusively from the `VITE_API_URL` environment variable, with no hardcoded `localhost:5001` strings in source files other than the default fallback in `lib/apiClient.ts`.
2. THE Frontend SHALL include a `.env.example` file listing all `VITE_*` variables with placeholder values and inline comments.
3. THE Frontend's `.gitignore` SHALL include `.env.local` and `.env.production` to prevent secrets from being committed.
4. WHEN `VITE_API_URL` is not set at build time, THE API_Client SHALL log a warning to the console in development mode and fall back to `http://localhost:5001`.

---

### Requirement 19: Performance Optimizations

**User Story:** As a developer, I want lazy loading, code splitting, and bundle optimizations in place, so that the application loads quickly even as the feature set grows.

#### Acceptance Criteria

1. THE Frontend SHALL implement route-based code splitting using `React.lazy` for all page-level components, so that no single initial JS bundle exceeds 250 KB gzipped.
2. THE Frontend SHALL memoize expensive derived computations using `useMemo` and prevent unnecessary child re-renders using `React.memo` on pure presentational components.
3. THE Frontend's Vite configuration SHALL enable `build.rollupOptions.output.manualChunks` to separate `react`, `react-dom`, `framer-motion`, and `@tanstack/react-query` into vendor chunks.
4. THE Frontend SHALL lazy-load all SVG_Doodle assets using dynamic `import()` or inline them as React components (rather than `<img>` src attributes) to avoid render-blocking resource fetches.
5. WHEN the production build runs (`vite build`), THE build process SHALL complete without errors and produce a `dist/` folder with hashed asset filenames for cache busting.

---

### Requirement 20: Code Quality Standards

**User Story:** As a developer, I want enforced code quality standards across the frontend codebase, so that the code is readable, consistent, and free of common errors.

#### Acceptance Criteria

1. THE Frontend SHALL include an ESLint configuration file extending `eslint:recommended`, `plugin:react/recommended`, `plugin:@typescript-eslint/recommended`, and `plugin:react-hooks/recommended`.
2. THE Frontend SHALL include a Prettier configuration file (`.prettierrc`) specifying: `printWidth: 100`, `singleQuote: true`, `trailingComma: 'all'`, and `semi: true`.
3. WHEN ESLint runs against the `src/` directory, THE linter SHALL report zero errors (warnings are acceptable).
4. THE Frontend SHALL implement reusable custom hooks for recurring logic patterns: `useAuth` (reading Auth_Store and exposing login/logout helpers), `useTheme` (reading UI_Store theme and exposing the toggle), and `useToast` (wrapping `react-hot-toast` calls behind a typed interface).
5. THE Frontend SHALL add JSDoc comments to all exported component props interfaces and all custom hook return types, documenting each field's purpose in one sentence.

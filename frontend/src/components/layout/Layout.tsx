import React from 'react';
import { Outlet } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Two-column application shell used by all protected routes.
 *
 * Desktop (≥ 768 px):
 *   - Renders a fixed `<Sidebar>` on the left.
 *   - The `<main>` content area uses `margin-left` that transitions in sync with
 *     the sidebar's animated width (240 px expanded / 64 px collapsed).
 *
 * Mobile (< 768 px):
 *   - Hides the desktop sidebar.
 *   - Shows a fixed `<Header>` at the top with a hamburger menu.
 *   - Adds top padding to `<main>` to clear the fixed header.
 *
 * Each route's outlet is wrapped in its own `<ErrorBoundary>` so a crash in
 * one page cannot propagate to the shell or sibling pages.
 */
export function Layout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile header + sidebar overlay (rendered inside Sidebar component) */}
      <Header />
      <Sidebar />

      {/* Main content */}
      <main
        style={{
          // Sync margin transition with Framer Motion sidebar width animation
          marginLeft: undefined,
        }}
        className={[
          'flex flex-1 flex-col overflow-y-auto',
          // Desktop: match sidebar width with a smooth transition
          'md:transition-[margin-left] md:duration-300 md:ease-in-out',
          sidebarOpen ? 'md:ml-60' : 'md:ml-16',
          // Mobile: top padding to clear fixed header
          'pt-14 md:pt-0',
        ].join(' ')}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default Layout;

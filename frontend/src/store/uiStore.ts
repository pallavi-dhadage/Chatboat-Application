/**
 * UI_Store — Zustand slice for transient UI state.
 *
 * Manages sidebar open/closed state, active view, and color theme.
 * Theme is applied eagerly at module load time (before React renders)
 * to eliminate the flash of unstyled content caused by post-render DOM updates.
 */

import { create } from 'zustand';
import type { UIState } from '../types';

const THEME_KEY = 'cf_theme';

/** Apply theme to DOM and persist to localStorage */
function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(THEME_KEY, theme);
}

// Read saved theme and apply it before React renders (prevents FOUC)
const savedTheme = (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null) ?? 'dark';
applyTheme(savedTheme);

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeView:  '/dashboard',
  theme:       savedTheme,

  /** Toggle sidebar between expanded and collapsed */
  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  /** Explicitly set sidebar open state (used by mobile backdrop click) */
  setSidebarOpen: (open: boolean) =>
    set({ sidebarOpen: open }),

  /** Update the active view identifier when navigating */
  setActiveView: (view: string) =>
    set({ activeView: view }),

  /**
   * Toggle between light and dark theme.
   * Updates the DOM class and persists the choice to localStorage.
   */
  toggleTheme: () =>
    set((s) => {
      const next: 'light' | 'dark' = s.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return { theme: next };
    }),
}));

/**
 * Property tests for UI_Store toggle invariants.
 *
 * Property 3: Two successive toggleSidebar() calls restore original sidebarOpen.
 * Property 4: Two successive toggleTheme() calls restore original theme;
 *             after first call document.documentElement.classList matches new theme.
 *
 * Validates: Requirements 3.3, 3.5
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useUIStore } from '../../store/uiStore';

describe('UI_Store — property tests', () => {
  beforeEach(() => {
    // Reset to light theme, sidebar open
    useUIStore.setState({ sidebarOpen: true, theme: 'light', activeView: '/dashboard' });
    document.documentElement.classList.remove('dark');
  });

  it('Property 3: two toggleSidebar() calls restore original sidebarOpen', () => {
    fc.assert(
      fc.property(fc.boolean(), (initial) => {
        useUIStore.setState({ sidebarOpen: initial });

        useUIStore.getState().toggleSidebar();
        useUIStore.getState().toggleSidebar();

        expect(useUIStore.getState().sidebarOpen).toBe(initial);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 4a: two toggleTheme() calls restore original theme', () => {
    fc.assert(
      fc.property(fc.constantFrom('light' as const, 'dark' as const), (initial) => {
        useUIStore.setState({ theme: initial });
        if (initial === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        useUIStore.getState().toggleTheme();
        useUIStore.getState().toggleTheme();

        expect(useUIStore.getState().theme).toBe(initial);
      }),
      { numRuns: 10 },
    );
  });

  it('Property 4b: after first toggleTheme(), document.documentElement reflects new theme', () => {
    fc.assert(
      fc.property(fc.constantFrom('light' as const, 'dark' as const), (initial) => {
        useUIStore.setState({ theme: initial });
        if (initial === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        useUIStore.getState().toggleTheme();
        const newTheme = useUIStore.getState().theme;

        expect(document.documentElement.classList.contains('dark')).toBe(newTheme === 'dark');
      }),
      { numRuns: 10 },
    );
  });
});

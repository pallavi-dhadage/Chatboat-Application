import { useUIStore } from '../store/uiStore';

export interface UseThemeReturn {
  /** Current theme value */
  theme: 'light' | 'dark';
  /** Toggle between light and dark; persists to localStorage and updates DOM */
  toggleTheme: () => void;
  /** Convenience boolean — true when theme is 'dark' */
  isDark: boolean;
}

/**
 * Hook for reading and toggling the application colour theme.
 *
 * Reads from `UI_Store` using a selector so the component only re-renders
 * when `theme` or `toggleTheme` change (not on unrelated store updates).
 *
 * @returns `{ theme, toggleTheme, isDark }`
 *
 * @example
 * ```tsx
 * const { isDark, toggleTheme } = useTheme();
 * return (
 *   <button onClick={toggleTheme}>
 *     {isDark ? '☀️ Light' : '🌙 Dark'}
 *   </button>
 * );
 * ```
 */
export function useTheme(): UseThemeReturn {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return { theme, toggleTheme, isDark: theme === 'dark' };
}

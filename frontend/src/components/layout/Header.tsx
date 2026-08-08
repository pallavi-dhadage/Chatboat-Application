import React from 'react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';

const HamburgerIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

/**
 * Mobile-only top header bar.
 * Hidden on viewports ≥ 768 px (`md:hidden`).
 *
 * Renders the ChatFlow AI wordmark on the left, a hamburger button that
 * toggles `UI_Store.sidebarOpen` on the right, and the current user's
 * avatar for quick access to Settings.
 */
export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="block md:hidden fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-navy-950 px-4 shadow-md">
      {/* ChatFlow AI wordmark */}
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-teal-500"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.9.52 3.67 1.42 5.19L2 22l4.81-1.42A9.956 9.956 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.7 0-3.29-.44-4.67-1.22l-.33-.19-3.43 1.01 1.01-3.43-.19-.33A7.948 7.948 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
        </svg>
        <span className="text-sm font-bold text-white">ChatFlow AI</span>
      </div>

      {/* Right side: avatar + hamburger */}
      <div className="flex items-center gap-3">
        {user && (
          <Link to="/settings" aria-label="Open settings">
            <Avatar avatar_url={user.avatar_url} name={user.name} size="w-7 h-7" />
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="flex h-8 w-8 items-center justify-center rounded-md text-navy-300 transition duration-150 hover:bg-navy-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <HamburgerIcon />
        </button>
      </div>
    </header>
  );
}

export default Header;

/**
 * Sidebar — main navigation with notification badge.
 */
import { NavLink } from 'react-router-dom';
import ThemeToggle from '../common/ThemeToggle';
import Avatar from '../common/Avatar';
import { useAuthStore } from '../../store/authSlice';
import { useNotificationStore } from '../../store/notificationSlice';

const NAV_ITEMS = [
  { label: 'Chats',        icon: '💬', to: '/'           },
  { label: 'AI Assistant', icon: '🤖', to: '/assistant'  },
  { label: 'Analytics',    icon: '📊', to: '/analytics'  },
  { label: 'Settings',     icon: '⚙️', to: '/settings'   },
];

export default function Sidebar() {
  const { user, logout }        = useAuthStore();
  const { unreadCount }         = useNotificationStore();

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-gray-800 border-r
                      border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="font-bold text-lg text-blue-600 dark:text-blue-400">AI Chat</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
               ${isActive
                 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                 : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`
            }
          >
            <span>{icon}</span>
            <span className="flex-1">{label}</span>
            {label === 'Chats' && unreadCount > 0 && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.role}</p>
          </div>
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-xs text-red-500 hover:text-red-600 p-1 rounded"
            aria-label="Log out"
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  );
}

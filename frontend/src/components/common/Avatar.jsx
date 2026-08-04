/**
 * Avatar — displays user avatar image with initials fallback.
 * Generates a background colour deterministically from the user's ID.
 */

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

function getBgColor(userId = '') {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

export default function Avatar({ user, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const base = `rounded-full flex items-center justify-center font-semibold text-white
                select-none overflow-hidden ${sizeClasses[size] || sizeClasses.md} ${className}`;

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={`${user.name} avatar`}
        className={`${base} object-cover`}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  return (
    <div
      className={base}
      style={{ backgroundColor: getBgColor(user?.id) }}
      aria-label={`${user?.name} avatar`}
    >
      {getInitials(user?.name)}
    </div>
  );
}

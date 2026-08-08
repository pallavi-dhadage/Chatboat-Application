import React from 'react';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface BadgeProps {
  /** The role string to display */
  role: UserRole;
  /** Additional className overrides */
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; classes: string }> = {
  user: {
    label: 'User',
    classes: 'bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-200',
  },
  moderator: {
    label: 'Moderator',
    classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  },
  admin: {
    label: 'Admin',
    classes: 'bg-navy-600 text-white dark:bg-navy-500',
  },
};

/**
 * Role badge component using the navy/teal palette.
 * Renders a small pill with the user's role label.
 *
 * @example
 * ```tsx
 * <Badge role="admin" />
 * ```
 */
const Badge = React.memo<BadgeProps>(function Badge({ role, className = '' }: BadgeProps) {
  const config = roleConfig[role] ?? roleConfig.user;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.classes,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {config.label}
    </span>
  );
});

export default Badge;

import React from 'react';

export interface AvatarProps {
  /** URL of the user's avatar image; if null/undefined, renders initials fallback */
  avatar_url?: string | null;
  /** User's display name — used to generate initials fallback */
  name: string;
  /** Tailwind size class (width + height), defaults to "w-9 h-9" */
  size?: string;
  /** Additional className overrides */
  className?: string;
}

/**
 * Returns up to two initials from a display name.
 * "John Doe" → "JD", "Alice" → "A"
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
}

/**
 * Avatar component that renders a user's avatar image when available,
 * or a styled initials fallback div using the navy/teal palette.
 *
 * @example
 * ```tsx
 * <Avatar avatar_url={user.avatar_url} name={user.name} />
 * ```
 */
const Avatar = React.memo<AvatarProps>(function Avatar({
  avatar_url,
  name,
  size = 'w-9 h-9',
  className = '',
}: AvatarProps) {
  const baseClasses = [
    'inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
    size,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={name}
        className={[baseClasses, 'object-cover'].join(' ')}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={[
        baseClasses,
        'bg-teal-500 text-white text-xs font-semibold select-none',
      ].join(' ')}
      aria-label={name}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
});

export default Avatar;

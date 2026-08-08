import React from 'react';

export interface SkeletonProps {
  /** Width as a Tailwind class or inline value (e.g. "w-32" or "100%") */
  width?: string;
  /** Height as a Tailwind class (e.g. "h-4") */
  height?: string;
  /** Optional border radius class (e.g. "rounded-full" for circles) */
  rounded?: string;
  /** Additional className overrides */
  className?: string;
}

/**
 * Skeleton loading placeholder with shimmer animation.
 * Light mode: cycles bg-gray-200 → bg-gray-300
 * Dark mode:  cycles bg-gray-700 → bg-gray-600
 */
const Skeleton = React.memo<SkeletonProps>(function Skeleton({
  width,
  height,
  rounded,
  className,
}: SkeletonProps) {
  const classes = [
    'animate-shimmer',
    'bg-gray-200',
    'dark:bg-gray-700',
    width ?? 'w-full',
    height ?? 'h-4',
    rounded ?? 'rounded',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} aria-hidden="true" />;
});

export default Skeleton;

/**
 * Full-viewport skeleton — intended as a Suspense fallback while lazy-loaded
 * route chunks are being fetched.
 */
export function FullPageSkeleton() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white dark:bg-gray-900">
      <Skeleton width="w-48" height="h-6" rounded="rounded-md" />
      <Skeleton width="w-64" height="h-4" rounded="rounded" />
      <Skeleton width="w-56" height="h-4" rounded="rounded" />
    </div>
  );
}

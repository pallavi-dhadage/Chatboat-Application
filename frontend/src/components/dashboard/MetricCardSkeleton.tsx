import React from 'react';
import Skeleton from '../ui/Skeleton';

/**
 * Skeleton placeholder for a MetricCard.
 * Composed of four Skeleton blocks matching the MetricCard layout:
 * icon area, title line, large value, and small trend label.
 */
export const MetricCardSkeleton = React.memo(function MetricCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-md dark:bg-navy-900">
      {/* Icon area — square block top-left */}
      <Skeleton width="w-10" height="h-10" rounded="rounded-lg" />

      {/* Title line */}
      <Skeleton width="w-24" height="h-3" rounded="rounded" />

      {/* Large value */}
      <Skeleton width="w-32" height="h-8" rounded="rounded-md" />

      {/* Trend label */}
      <Skeleton width="w-16" height="h-3" rounded="rounded" />
    </div>
  );
});

export default MetricCardSkeleton;

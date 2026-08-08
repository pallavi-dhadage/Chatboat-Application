import React from 'react';
import { motion } from 'framer-motion';

/**
 * Props for the MetricCard component.
 */
export interface MetricCardProps {
  /** KPI label shown above the value (e.g. "Total Users") */
  label: string;
  /** Formatted value string displayed prominently (e.g. "1,234" or "380ms") */
  value: string;
  /** Trend direction for the visual indicator arrow */
  trend?: 'up' | 'down' | 'neutral';
  /** Functional icon rendered on the left side of the card */
  icon: React.ComponentType<{ className?: string }>;
  /** Decorative SVG accent component rendered in the top-right corner */
  decorativeIcon: React.ComponentType<{ className?: string }>;
  /** Base gradient Tailwind class names applied to the card background */
  gradientClassName?: string;
}

/** Maps trend direction to an SVG arrow indicator with appropriate color */
function TrendIndicator({ trend }: { trend: MetricCardProps['trend'] }) {
  if (!trend || trend === 'neutral') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M2 6h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Neutral
      </span>
    );
  }

  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400">
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M6 9V3M3 6l3-3 3 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Up
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
      <svg
        className="h-3 w-3"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M6 3v6M9 6l-3 3-3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Down
    </span>
  );
}

/**
 * MetricCard displays a single KPI with a gradient background, functional icon,
 * trend indicator, and a decorative SVG accent in the top-right corner.
 *
 * Hover effects: Framer Motion scale 1.03 + TailwindCSS shadow elevation over 150 ms.
 *
 * @example
 * ```tsx
 * <MetricCard
 *   label="Total Users"
 *   value="1,234"
 *   trend="up"
 *   icon={UsersIcon}
 *   decorativeIcon={CornerAccent}
 *   gradientClassName="from-navy-800 to-navy-700"
 * />
 * ```
 */
const MetricCard = React.memo<MetricCardProps>(function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  decorativeIcon: DecorativeIcon,
  gradientClassName = 'from-navy-800 to-navy-700',
}: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.15, ease: 'easeInOut' }}
      className={[
        // Layout
        'relative overflow-hidden rounded-xl p-5',
        // Linear gradient background
        'bg-gradient-to-br',
        gradientClassName,
        // Shadow and transition
        'shadow-md transition-shadow duration-150 hover:shadow-xl',
        // Text defaults
        'text-white',
        // Cursor
        'cursor-default select-none',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Decorative SVG accent — top-right corner, aria-hidden */}
      <div className="pointer-events-none absolute right-0 top-0" aria-hidden="true">
        <DecorativeIcon className="h-20 w-20 text-white opacity-[0.08] dark:opacity-[0.10]" />
      </div>

      {/* Card body */}
      <div className="relative z-10 flex items-start gap-4">
        {/* Functional icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          {/* KPI label */}
          <p className="truncate text-xs font-medium uppercase tracking-wider text-white/70">
            {label}
          </p>

          {/* Metric value */}
          <p className="mt-1 text-2xl font-bold leading-none text-white">
            {value}
          </p>

          {/* Trend indicator */}
          {trend !== undefined && (
            <div className="mt-2">
              <TrendIndicator trend={trend} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default MetricCard;

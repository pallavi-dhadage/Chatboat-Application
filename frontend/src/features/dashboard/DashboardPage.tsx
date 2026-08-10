import React, { useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuthStore } from '../../store/authStore';
import MetricCard from '../../components/dashboard/MetricCard';
import MetricCardSkeleton from '../../components/dashboard/MetricCardSkeleton';
import DotGrid from '../../assets/doodles/DotGrid';
import WaveCurve from '../../assets/doodles/WaveCurve';
import type { AnalyticsPayload } from '../../types';

// ---------------------------------------------------------------------------
// Inline SVG icon components — no external dependency required
// ---------------------------------------------------------------------------

/** Users icon — two silhouettes */
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Message bubble icon */
function MessageIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Sparkles / AI icon */
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-5.26L4 11l5.91-1.74z" />
      <path d="M19 5l.94 2.81L22 9l-2.06.19L19 12l-.94-2.81L16 9l2.06-.19z" />
    </svg>
  );
}

/** Clock / response-time icon */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/** Decorative circle-ring accent used in card top-right corners */
function CircleAccent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" />
      <circle cx="40" cy="40" r="20" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

/** Decorative hex-grid accent */
function HexAccent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <polygon
        points="40,5 70,22 70,58 40,75 10,58 10,22"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
      />
      <polygon
        points="40,18 58,28 58,52 40,62 22,52 22,28"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}

/** Decorative diamond accent */
function DiamondAccent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect
        x="15"
        y="15"
        width="50"
        height="50"
        rx="4"
        stroke="currentColor"
        strokeWidth="5"
        transform="rotate(45 40 40)"
      />
      <rect
        x="25"
        y="25"
        width="30"
        height="30"
        rx="2"
        stroke="currentColor"
        strokeWidth="3"
        transform="rotate(45 40 40)"
      />
    </svg>
  );
}

/** Decorative wave-lines accent */
function WaveAccent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M5 20 C15 10, 25 30, 35 20 S55 10, 65 20 S75 30, 80 20"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M5 40 C15 30, 25 50, 35 40 S55 30, 65 40 S75 50, 80 40"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M5 60 C15 50, 25 70, 35 60 S55 50, 65 60 S75 70, 80 60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// METRIC_CARDS_CONFIG — static configuration for the four KPI cards
// ---------------------------------------------------------------------------

interface MetricCardConfig {
  /** Card label */
  label: string;
  /** Derive the display value from AnalyticsPayload; returns "—" when payload is undefined */
  getValue: (data: AnalyticsPayload | undefined) => string;
  /** Visual trend indicator */
  trend: 'up' | 'down' | 'neutral';
  /** Functional icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Decorative corner accent component */
  decorativeIcon: React.ComponentType<{ className?: string }>;
  /** TailwindCSS gradient classes for the card background */
  gradientClassName: string;
}

const METRIC_CARDS_CONFIG: MetricCardConfig[] = [
  {
    label: 'Total Users',
    getValue: (data) =>
      data !== undefined ? data.active_users.toLocaleString() : '—',
    trend: 'up',
    icon: UsersIcon,
    decorativeIcon: CircleAccent,
    gradientClassName: 'from-navy-800 to-navy-700',
  },
  {
    label: 'Messages Sent',
    getValue: (data) =>
      data !== undefined ? data.message_volume.toLocaleString() : '—',
    trend: 'up',
    icon: MessageIcon,
    decorativeIcon: HexAccent,
    gradientClassName: 'from-teal-700 to-teal-600',
  },
  {
    label: 'AI Usage',
    getValue: (data) =>
      data !== undefined
        ? (data.ai_insights?.smart_reply_requests ?? 0).toLocaleString()
        : '—',
    trend: 'neutral',
    icon: SparklesIcon,
    decorativeIcon: DiamondAccent,
    gradientClassName: 'from-navy-700 to-navy-600',
  },
  {
    label: 'Avg Response',
    getValue: (data) =>
      data !== undefined ? `${data.response_time_ms}ms` : '—',
    trend: 'neutral',
    icon: ClockIcon,
    decorativeIcon: WaveAccent,
    gradientClassName: 'from-teal-800 to-teal-700',
  },
];

// ---------------------------------------------------------------------------
// DashboardPage
// ---------------------------------------------------------------------------

/**
 * Main dashboard view shown to authenticated users.
 *
 * - Fetches analytics via `useAnalytics` and renders four `MetricCard` components.
 * - Renders four `MetricCardSkeleton` placeholders while loading.
 * - On error, renders cards with "—" fallback values and fires an error toast.
 * - Displays a personalised welcome message using the current user's first name.
 * - Renders `DotGrid` and `WaveCurve` decorative SVGs in an absolute background layer.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 6.5, 9.1, 9.2
 */
export default function DashboardPage() {
  const { data, isLoading, isError, error } = useAnalytics();
  const user = useAuthStore((s) => s.user);

  // Requirement 7.4 — fire a toast when the analytics fetch fails.
  // We call toast.error directly (stable import) rather than useToast() to
  // avoid stale-closure / unstable-reference issues in the dependency array.
  useEffect(() => {
    if (isError && error) {
      const msg = error.message ?? 'Failed to load analytics data.';
      toast.error(msg.slice(0, 80), { duration: 5000 });
    }
  }, [isError, error]);

  // Derive the user's first name for the welcome heading
  const firstName = useMemo(
    () => user?.name?.split(' ')[0] ?? 'there',
    [user?.name],
  );

  // When loading=false and data is undefined (error state), getValue returns "—"
  // for every card — this satisfies the fallback requirement.
  const showSkeletons = isLoading;

  return (
    <div className="relative min-h-full overflow-hidden p-6">
      {/* ------------------------------------------------------------------ */}
      {/* Background decorative layer — absolute, pointer-events-none         */}
      {/* Opacity range: 0.07 (within the required [0.04, 0.10] window)       */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {/* DotGrid — top-left corner */}
        <DotGrid
          className="absolute -left-4 -top-4 text-navy-500 opacity-[0.07] dark:text-navy-300 dark:opacity-[0.09]"
        />

        {/* WaveCurve — bottom-right corner */}
        <WaveCurve
          className="absolute bottom-8 right-0 text-teal-500 opacity-[0.07] dark:text-teal-300 dark:opacity-[0.09]"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 mb-8">
        <h1 className="text-2xl font-bold text-navy-950 dark:text-white">
          Welcome back, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here&apos;s a snapshot of platform activity.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Metric cards grid                                                   */}
      {/* Responsive: 1 col < 640 px, 2 col 640–1024 px, 4 col ≥ 1024 px    */}
      {/* Requirement 6.5                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {showSkeletons
          ? // Loading state — render four skeleton placeholders (Requirement 7.3)
            Array.from({ length: 4 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))
          : // Data or error state — render real cards with values or "—" fallback
            METRIC_CARDS_CONFIG.map((config) => (
              <MetricCard
                key={config.label}
                label={config.label}
                value={config.getValue(data)}
                trend={config.trend}
                icon={config.icon}
                decorativeIcon={config.decorativeIcon}
                gradientClassName={config.gradientClassName}
              />
            ))}
      </div>
    </div>
  );
}

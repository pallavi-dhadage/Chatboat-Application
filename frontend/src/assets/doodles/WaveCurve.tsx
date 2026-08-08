import React from 'react';

export interface DoodleProps {
  /**
   * Tailwind opacity/color class overrides.
   * Default opacity is 0.07 (light mode).
   */
  className?: string;
}

/**
 * Decorative abstract wave-curve SVG background element.
 * Renders a series of smooth Bézier curves using currentColor.
 * Positioned absolutely by the parent — does not affect document flow.
 *
 * Default opacity: 0.07 (light mode). Override via className for dark mode,
 * e.g. "dark:opacity-[0.09]".
 *
 * @example
 * ```tsx
 * <WaveCurve className="absolute bottom-0 right-0 opacity-[0.07] dark:opacity-[0.09] text-teal-400 pointer-events-none" />
 * ```
 */
const WaveCurve = React.memo<DoodleProps>(function WaveCurve({ className = '' }: DoodleProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="320"
      height="120"
      viewBox="0 0 320 120"
      aria-hidden="true"
      focusable="false"
      style={{ pointerEvents: 'none' }}
      className={['opacity-[0.07]', className].filter(Boolean).join(' ')}
    >
      {/* Wave 1 */}
      <path
        d="M0 60 C40 20, 80 100, 120 60 S200 20, 240 60 S300 100, 320 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Wave 2 — offset */}
      <path
        d="M0 80 C40 40, 80 120, 120 80 S200 40, 240 80 S300 120, 320 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Wave 3 — tightest */}
      <path
        d="M0 40 C40 10, 80 70, 120 40 S200 10, 240 40 S300 70, 320 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
});

export default WaveCurve;

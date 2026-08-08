import React from 'react';

export interface DoodleProps {
  /**
   * Tailwind opacity/color class overrides.
   * Default opacity is 0.07 (light mode).
   */
  className?: string;
}

/**
 * Decorative corner-accent SVG element — a geometric quarter-arc shape
 * typically placed in the top-right or bottom-left corner of a card.
 * Uses currentColor so it responds to Tailwind text-color utilities.
 *
 * Default opacity: 0.07 (light mode). Override via className for dark mode.
 *
 * @example
 * ```tsx
 * <CornerAccent className="absolute top-0 right-0 opacity-[0.08] dark:opacity-[0.10] text-teal-400 pointer-events-none" />
 * ```
 */
const CornerAccent = React.memo<DoodleProps>(function CornerAccent({
  className = '',
}: DoodleProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="80"
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
      style={{ pointerEvents: 'none' }}
      className={['opacity-[0.07]', className].filter(Boolean).join(' ')}
    >
      {/* Outer arc */}
      <path
        d="M80 0 A80 80 0 0 0 0 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Middle arc */}
      <path
        d="M80 20 A60 60 0 0 0 20 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Inner arc */}
      <path
        d="M80 40 A40 40 0 0 0 40 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      {/* Dot accent */}
      <circle cx="76" cy="76" r="3" fill="currentColor" opacity="0.6" />
    </svg>
  );
});

export default CornerAccent;

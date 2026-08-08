import React from 'react';

export interface DoodleProps {
  /**
   * Tailwind opacity/color class overrides.
   * Default opacity is 0.07 (light mode). For dark mode pass e.g. "opacity-[0.09]".
   */
  className?: string;
}

/**
 * Decorative dot-grid SVG background element.
 * Renders a 10×10 grid of small circles using currentColor.
 * Positioned absolutely by the parent — does not affect document flow.
 *
 * @example
 * ```tsx
 * <DotGrid className="absolute top-0 left-0 opacity-[0.07] dark:opacity-[0.09] text-navy-500 pointer-events-none" />
 * ```
 */
const DotGrid = React.memo<DoodleProps>(function DotGrid({ className = '' }: DoodleProps) {
  const dots: React.ReactNode[] = [];
  const cols = 10;
  const rows = 10;
  const gap = 20;
  const r = 1.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      dots.push(
        <circle
          key={`${row}-${col}`}
          cx={col * gap + r}
          cy={row * gap + r}
          r={r}
          fill="currentColor"
        />,
      );
    }
  }

  const size = (cols - 1) * gap + r * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
      style={{ pointerEvents: 'none' }}
      className={['opacity-[0.07]', className].filter(Boolean).join(' ')}
    >
      {dots}
    </svg>
  );
});

export default DotGrid;

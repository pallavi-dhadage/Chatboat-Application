import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'ghost' | 'danger';
  /** Show a loading spinner and disable interaction */
  loading?: boolean;
  /** Button contents */
  children: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-teal-500 text-white hover:bg-teal-600 focus-visible:ring-teal-500',
  ghost:
    'bg-transparent text-navy-900 dark:text-navy-100 hover:bg-navy-100 dark:hover:bg-navy-800 focus-visible:ring-navy-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
};

/**
 * Reusable button with three visual variants, a loading state, and micro-animation
 * hover effects per the design specification (scale 1.02, brightness +10%, 150 ms).
 *
 * @example
 * ```tsx
 * <Button variant="primary" loading={isSubmitting} onClick={handleSubmit}>
 *   Save
 * </Button>
 * ```
 */
const Button = React.memo<ButtonProps>(function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={[
        // Base
        'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
        'transition duration-150 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        // Hover micro-animations (skipped when disabled)
        !isDisabled && 'hover:scale-[1.02] hover:brightness-110',
        // Variant colours
        variantClasses[variant],
        // Disabled state
        isDisabled && 'cursor-not-allowed opacity-50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
});

export default Button;

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { loginSchema, type LoginFormValues } from './schemas';
import Button from '../../components/ui/Button';

/**
 * LoginPage — React Hook Form + Zod schema-validated sign-in form.
 *
 * Validates: Requirements 13.1, 13.3, 13.4, 13.6, 13.7
 *
 * Behaviour:
 * - Already-authenticated users are immediately redirected to /dashboard.
 * - Validation errors appear inline within 50 ms (mode: 'onBlur').
 * - While submitting, the button is disabled and shows a loading spinner.
 * - On success, tokens are stored via setAuth (inside useAuth.login) and the
 *   user is navigated to /dashboard.
 * - On API error, an error toast is shown and the form becomes re-submittable.
 */
export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  // Redirect authenticated users away from the login page immediately.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
      toast.error(message.slice(0, 80));
      // isSubmitting is reset automatically by react-hook-form after the
      // handleSubmit wrapper resolves (we do not re-throw, so the form
      // becomes re-submittable once this async fn returns).
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-navy-950">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg dark:bg-navy-900">
        {/* Card header */}
        <div className="rounded-t-2xl bg-navy-950 px-8 py-7 dark:bg-navy-900">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-navy-300">Sign in to ChatFlow AI</p>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="px-8 py-7"
          aria-label="Login form"
        >
          {/* Email field */}
          <div className="mb-5">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-200"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={[
                'w-full rounded-lg border px-4 py-2.5 text-sm outline-none',
                'bg-white text-navy-950 dark:bg-navy-800 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-navy-400',
                'transition duration-150 focus:ring-2',
                errors.email
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 focus:border-teal-500 focus:ring-teal-400 dark:border-navy-600',
              ]
                .filter(Boolean)
                .join(' ')}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="mt-1 text-xs text-red-500"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-200"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={[
                'w-full rounded-lg border px-4 py-2.5 text-sm outline-none',
                'bg-white text-navy-950 dark:bg-navy-800 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-navy-400',
                'transition duration-150 focus:ring-2',
                errors.password
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 focus:border-teal-500 focus:ring-teal-400 dark:border-navy-600',
              ]
                .filter(Boolean)
                .join(' ')}
              {...register('password')}
            />
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="mt-1 text-xs text-red-500"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full py-2.5"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>

          {/* Register link */}
          <p className="mt-5 text-center text-sm text-gray-500 dark:text-navy-400">
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';

import { registerSchema, type RegisterFormValues } from './schemas';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { apiClient } from '../../lib/apiClient';
import Button from '../../components/ui/Button';

/**
 * RegisterPage — React Hook Form + Zod schema-validated registration form.
 *
 * Validates: Requirements 13.2, 13.3, 13.5, 13.6, 13.7
 *
 * Behaviour:
 * - Already-authenticated users are immediately redirected to /dashboard.
 * - All hooks are unconditionally called before any early returns (Rules of Hooks).
 * - Validation errors appear inline within 50 ms (mode: 'onBlur').
 * - While submitting, the button is disabled and shows a loading spinner.
 * - On valid submit:
 *     1. POST /api/v1/auth/register  — creates the account
 *     2. useAuth().login(email, pw)  — auto-login, stores tokens in Auth_Store
 *     3. navigate('/dashboard')      — redirect on success
 * - On API error, an error toast (≤80 chars) is shown and the form re-enables.
 */
export default function RegisterPage() {
  // --- All hooks called unconditionally first (Rules of Hooks) ---
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  // Redirect already-authenticated users — safe to return after all hooks.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      // Step 1: Create the account
      await apiClient.post('/auth/register', {
        name: values.name,
        email: values.email,
        password: values.password,
      });

      // Step 2: Auto-login with the same credentials (stores tokens in Auth_Store)
      await login(values.email, values.password);

      // Step 3: Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // Extract a human-readable message from the Axios error or fallback
      let message = 'Registration failed. Please try again.';
      if (err instanceof AxiosError) {
        const data = err.response?.data as
          | { message?: string; error?: string }
          | undefined;
        const serverMsg = data?.message ?? data?.error;
        if (serverMsg) {
          message = serverMsg;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message.slice(0, 80));
      // react-hook-form resets isSubmitting automatically once this async fn
      // returns, re-enabling the submit button.
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-navy-950">
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg dark:bg-navy-900">
        {/* Card header — matches LoginPage navy header style */}
        <div className="rounded-t-2xl bg-navy-950 px-8 py-7 dark:bg-navy-900">
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="mt-1 text-sm text-navy-300">Join ChatFlow AI — it&apos;s free</p>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5 px-8 py-7"
          aria-label="Registration form"
        >
          {/* Name field */}
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-200"
            >
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={[
                'w-full rounded-lg border px-4 py-2.5 text-sm outline-none',
                'bg-white text-navy-950 dark:bg-navy-800 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-navy-400',
                'transition duration-150 focus:ring-2',
                errors.name
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 focus:border-teal-500 focus:ring-teal-400 dark:border-navy-600',
              ]
                .filter(Boolean)
                .join(' ')}
              {...register('name')}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="mt-1 text-xs text-red-500">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-200"
            >
              Email address
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
              <p id="email-error" role="alert" className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-200"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
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
              <p id="password-error" role="alert" className="mt-1 text-xs text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-navy-800 dark:text-navy-200"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              className={[
                'w-full rounded-lg border px-4 py-2.5 text-sm outline-none',
                'bg-white text-navy-950 dark:bg-navy-800 dark:text-white',
                'placeholder:text-gray-400 dark:placeholder:text-navy-400',
                'transition duration-150 focus:ring-2',
                errors.confirmPassword
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 focus:border-teal-500 focus:ring-teal-400 dark:border-navy-600',
              ]
                .filter(Boolean)
                .join(' ')}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p
                id="confirmPassword-error"
                role="alert"
                className="mt-1 text-xs text-red-500"
              >
                {errors.confirmPassword.message}
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
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>

          {/* Link to login */}
          <p className="text-center text-sm text-gray-500 dark:text-navy-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

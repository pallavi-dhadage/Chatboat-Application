import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { profileSchema, type ProfileFormValues } from '../auth/schemas';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';

/**
 * SettingsPage — profile management, theme toggle, account info, and logout.
 *
 * Implements Requirements 17.1–17.5:
 *   17.1 Profile form pre-populated from Auth_Store.user, validated via profileSchema
 *   17.2 On submit calls PATCH /api/v1/users/me, updates Auth_Store, shows success toast
 *   17.3 Theme toggle calling useTheme().toggleTheme
 *   17.4 Account section: email (read-only), role badge, account creation date
 *   17.5 Danger Zone: Log Out calls useAuth().logout, clears localStorage, redirects /login
 */
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { toggleTheme, isDark } = useTheme();
  const { logout } = useAuth();
  const toast = useToast();
  const updateProfile = useUpdateProfile();

  // ── Profile form ──────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      status: user?.status ?? '',
      bio: user?.bio ?? '',
    },
  });

  const onProfileSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate(values, {
      onSuccess: (updatedUser) => {
        setUser(updatedUser);
        toast.success('Profile updated');
      },
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to update profile';
        toast.error(message);
      },
    });
  };

  const isSaving = isSubmitting || updateProfile.isPending;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {/* ── Profile Section ────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-navy-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>

        <div className="mb-6 flex items-center gap-4">
          {user && (
            <Avatar avatar_url={user.avatar_url} name={user.name} size="w-16 h-16" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{user?.name ?? '—'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email ?? '—'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onProfileSubmit)} noValidate className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="settings-name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name
            </label>
            <input
              id="settings-name"
              type="text"
              autoComplete="name"
              {...register('name')}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition duration-150 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-navy-950 dark:text-white dark:placeholder-gray-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="settings-status"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Status
            </label>
            <input
              id="settings-status"
              type="text"
              placeholder="What are you up to?"
              {...register('status')}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition duration-150 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-navy-950 dark:text-white dark:placeholder-gray-500"
            />
            {errors.status && (
              <p className="mt-1 text-xs text-red-500">{errors.status.message}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="settings-bio"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Bio
            </label>
            <textarea
              id="settings-bio"
              rows={3}
              placeholder="A little about yourself..."
              {...register('bio')}
              className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition duration-150 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-navy-950 dark:text-white dark:placeholder-gray-500"
            />
            {errors.bio && (
              <p className="mt-1 text-xs text-red-500">{errors.bio.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={isSaving}>
              Save changes
            </Button>
          </div>
        </form>
      </section>

      {/* ── Appearance / Theme Toggle ──────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-navy-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isDark ? 'Dark mode' : 'Light mode'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Toggle between light and dark interface themes
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            aria-pressed={isDark}
            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full bg-gray-200 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-500"
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                isDark ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>
      </section>

      {/* ── Account Section ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-navy-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Account</h2>
        <dl className="space-y-3 text-sm">
          {/* Email (read-only) */}
          <div className="flex items-center justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{user?.email ?? '—'}</dd>
          </div>

          {/* Role badge */}
          <div className="flex items-center justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Role</dt>
            <dd>{user ? <Badge role={user.role} /> : <span className="text-gray-900 dark:text-white">—</span>}</dd>
          </div>

          {/* Account creation date */}
          <div className="flex items-center justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Member since</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {user
                ? (() => {
                    // User interface doesn't include created_at; use a graceful fallback
                    const raw = (user as unknown as Record<string, unknown>).created_at;
                    if (typeof raw === 'string') {
                      return new Date(raw).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      });
                    }
                    return '—';
                  })()
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-800 dark:bg-navy-900">
        <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Signing out will clear your session and redirect you to the login page.
        </p>
        <Button variant="danger" onClick={logout}>
          Log Out
        </Button>
      </section>
    </div>
  );
}

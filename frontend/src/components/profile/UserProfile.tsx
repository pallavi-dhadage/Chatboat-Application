/**
 * UserProfile — profile view/edit form with avatar upload.
 * Uses the new apiClient and authStore.
 */
import React, { useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';
import type { User } from '../../types';

export default function UserProfile() {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({
    name:   user?.name   ?? '',
    status: user?.status ?? '',
    bio:    user?.bio    ?? '',
  });
  const [saving, setSaving]             = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await apiClient.patch<User>('/users/me', form);
      setUser(data);
      toast.success('Profile updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error(msg.slice(0, 80));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await apiClient.post<{ avatar_url: string }>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (user) setUser({ ...user, avatar_url: data.avatar_url });
      toast.success('Avatar updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Avatar upload failed';
      toast.error(msg.slice(0, 80));
      setAvatarPreview(null);
    }
  };

  const fields: Array<{ label: string; name: keyof typeof form; type: string; placeholder: string }> = [
    { label: 'Display name', name: 'name',   type: 'text',     placeholder: 'Alice' },
    { label: 'Status',       name: 'status', type: 'text',     placeholder: 'Available…' },
    { label: 'Bio',          name: 'bio',    type: 'textarea', placeholder: 'Tell us about yourself…' },
  ];

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar
            avatar_url={avatarPreview ?? user?.avatar_url ?? null}
            name={user?.name ?? ''}
            size="w-16 h-16"
          />
          <label
            className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center
                       justify-center rounded-full bg-teal-600 text-xs text-white
                       transition-colors hover:bg-teal-700"
            aria-label="Upload new avatar"
          >
            ✎
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => void handleAvatarChange(e)}
            />
          </label>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
          <p className="text-sm text-gray-500">{user?.role}</p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map(({ label, name, type, placeholder }) => (
          <div key={name}>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            {type === 'textarea' ? (
              <textarea
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                           text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500
                           dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                aria-label={label}
              />
            ) : (
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm
                           text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500
                           dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                aria-label={label}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full rounded-lg bg-teal-600 py-2 font-medium text-white
                   transition-colors hover:bg-teal-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

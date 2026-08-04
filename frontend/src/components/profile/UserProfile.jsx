/**
 * UserProfile — profile view/edit form with avatar upload.
 */
import { useState } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authSlice';
import Avatar from '../common/Avatar';
import toast from 'react-hot-toast';

export default function UserProfile() {
  const { user, setUser } = useAuthStore();
  const [form, setForm]   = useState({
    name:   user?.name   || '',
    status: user?.status || '',
    bio:    user?.bio    || '',
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await client.patch('/users/me', form);
      setUser(data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await client.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser({ ...user, avatar_url: data.avatar_url });
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Avatar upload failed');
      setAvatarPreview(null);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar user={{ ...user, avatar_url: avatarPreview || user?.avatar_url }} size="xl" />
          <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full
                             flex items-center justify-center cursor-pointer text-white text-xs
                             hover:bg-blue-700 transition-colors"
                 aria-label="Upload new avatar">
            ✎
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </label>
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
          <p className="text-sm text-gray-500">{user?.role}</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {[
          { label: 'Display name', name: 'name',   type: 'text',     placeholder: 'Alice' },
          { label: 'Status',       name: 'status', type: 'text',     placeholder: 'Available…' },
          { label: 'Bio',          name: 'bio',    type: 'textarea', placeholder: 'Tell us about yourself…' },
        ].map(({ label, name, type, placeholder }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {label}
            </label>
            {type === 'textarea' ? (
              <textarea
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={label}
              />
            ) : (
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={label}
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                   text-white font-medium rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

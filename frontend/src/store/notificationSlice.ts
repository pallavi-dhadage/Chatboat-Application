/**
 * Legacy notificationSlice.ts — redirects to the React Query useNotifications hook.
 * Provides a minimal Zustand-compatible shim for legacy components.
 */
import { create } from 'zustand';
import { apiClient } from '../lib/apiClient';
import type { Notification } from '../types';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<Notification[]>;
  addNotification: (n: Notification) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount:   0,

  fetchNotifications: async () => {
    const { data } = await apiClient.get<Notification[]>('/notifications');
    set({ notifications: data, unreadCount: data.filter((n) => !n.read_at).length });
    return data;
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount:   state.unreadCount + 1,
    })),

  markRead: async (id) => {
    await apiClient.post(`/notifications/${id}/read`);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: () => set({ unreadCount: 0 }),
}));

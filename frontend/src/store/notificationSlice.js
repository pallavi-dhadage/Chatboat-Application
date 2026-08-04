/**
 * Zustand notification store.
 */

import { create } from 'zustand';
import client from '../api/client';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,

  fetchNotifications: async () => {
    const { data } = await client.get('/notifications');
    set({ notifications: data, unreadCount: data.length });
    return data;
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount:   state.unreadCount + 1,
    }));
  },

  markRead: async (id) => {
    await client.post(`/notifications/${id}/read`);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set({ unreadCount: 0 });
  },
}));

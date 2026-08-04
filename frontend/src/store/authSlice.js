/**
 * Zustand auth store — user identity and JWT tokens.
 */

import { create } from 'zustand';
import client from '../api/client';

export const useAuthStore = create((set) => ({
  user:         JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken:  localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,

  login: async (email, password) => {
    const { data } = await client.post('/auth/login', { email, password });
    localStorage.setItem('access_token',  data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user',          JSON.stringify(data.user));
    set({ user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token });
    return data.user;
  },

  register: async (email, name, password) => {
    await client.post('/auth/register', { email, name, password });
  },

  logout: async () => {
    try {
      await client.post('/auth/logout');
    } catch { /* best-effort */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

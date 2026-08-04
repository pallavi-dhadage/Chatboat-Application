/**
 * Zustand chat store — conversations, messages, typing indicators, presence.
 */

import { create } from 'zustand';
import client from '../api/client';

export const useChatStore = create((set, get) => ({
  conversations:     [],
  activeConvId:      null,
  messages:          {},   // { [conversationId]: Message[] }
  typingUsers:       {},   // { [conversationId]: Set<userId> }
  presenceMap:       {},   // { [userId]: 'online' | 'offline' }
  smartReplies:      [],

  setActiveConversation: (id) => set({ activeConvId: id }),

  fetchConversations: async () => {
    const { data } = await client.get('/conversations');
    set({ conversations: data });
    return data;
  },

  fetchMessages: async (conversationId, page = 1) => {
    const { data } = await client.get(
      `/conversations/${conversationId}/messages`,
      { params: { page, page_size: 50 } }
    );
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: page === 1
          ? data.messages
          : [...(state.messages[conversationId] || []), ...data.messages],
      },
    }));
    return data;
  },

  addMessage: (message) => {
    const convId = message.conversation_id;
    set((state) => ({
      messages: {
        ...state.messages,
        [convId]: [message, ...(state.messages[convId] || [])],
      },
    }));
  },

  deleteMessage: (messageId, conversationId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || [])
          .filter((m) => m.id !== messageId),
      },
    }));
  },

  setTyping: (conversationId, userId, isTyping) => {
    set((state) => {
      const current = new Set(state.typingUsers[conversationId] || []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      return { typingUsers: { ...state.typingUsers, [conversationId]: current } };
    });
  },

  setPresence: (userId, status) => {
    set((state) => ({
      presenceMap: { ...state.presenceMap, [userId]: status },
    }));
  },

  setSmartReplies: (replies) => set({ smartReplies: replies }),
  clearSmartReplies: () => set({ smartReplies: [] }),
}));

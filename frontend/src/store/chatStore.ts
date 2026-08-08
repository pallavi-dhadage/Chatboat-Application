/**
 * Chat_Store — Zustand slice for real-time chat state.
 *
 * Holds ephemeral in-memory state for the active session.
 * The canonical message list is owned by React Query;
 * addMessage mirrors incoming Socket.IO events into local state
 * for notification badge counts.
 */

import { create } from 'zustand';
import type { ChatState, Conversation, Message } from '../types';

export const useChatStore = create<ChatState>((set) => ({
  conversations:        [],
  activeConversationId: null,
  messages:             {},
  typingUsers:          {},

  /** Replace the full conversations list */
  setConversations: (conversations: Conversation[]) =>
    set({ conversations }),

  /** Set or clear the active conversation */
  setActiveConversation: (id: string | null) =>
    set({ activeConversationId: id }),

  /**
   * Append a single message to a conversation's message array.
   * Creates the array if it does not yet exist.
   */
  addMessage: (conversationId: string, message: Message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  /** Update the typing users list for a specific conversation */
  setTypingUsers: (conversationId: string, users: string[]) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: users },
    })),
}));

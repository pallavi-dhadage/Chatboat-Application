/**
 * MessageThread — scrollable message list using React Query + Zustand.
 * Auto-scrolls to bottom on new messages.
 */
import React, { useEffect, useRef } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { useAuthStore } from '../../store/authStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import type { MessageThreadProps } from './MessageThread.d';

export default function MessageThread({ conversationId }: MessageThreadProps) {
  const { data, isLoading } = useMessages(conversationId);
  const user       = useAuthStore((s) => s.user);
  const bottomRef  = useRef<HTMLDivElement | null>(null);

  const convMessages = data?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length]);

  if (!conversationId) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Select a conversation
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
        Loading messages…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-3">
      {convMessages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === user?.id}
        />
      ))}
      <TypingIndicator conversationId={conversationId} />
      <div ref={bottomRef} />
    </div>
  );
}

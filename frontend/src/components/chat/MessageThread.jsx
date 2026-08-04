/**
 * MessageThread — scrollable message list that auto-scrolls to bottom on new messages.
 */
import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatSlice';
import { useAuthStore } from '../../store/authSlice';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function MessageThread({ conversationId }) {
  const { messages, typingUsers, fetchMessages } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);

  const convMessages = messages[conversationId] || [];
  const typingSet    = typingUsers[conversationId] || new Set();

  useEffect(() => {
    if (conversationId) fetchMessages(conversationId);
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Select a conversation
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col-reverse">
      <div ref={bottomRef} />
      {[...typingSet].map((uid) => (
        <TypingIndicator key={uid} userId={uid} />
      ))}
      {[...convMessages].map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === user?.id}
        />
      ))}
    </div>
  );
}

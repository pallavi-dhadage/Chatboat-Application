/**
 * TypingIndicator — animated dots shown when another user is typing in a conversation.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';

interface TypingIndicatorProps {
  /** The conversation ID to watch for typing users */
  conversationId: string;
}

export default function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const typingUsers = useChatStore(
    (s) => s.typingUsers[conversationId] ?? [],
  );

  if (typingUsers.length === 0) return null;

  return (
    <div className="mb-2 flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-700">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-gray-400"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {typingUsers[0]} is typing…
      </span>
    </div>
  );
}

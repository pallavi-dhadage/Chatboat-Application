/**
 * MessageBubble — renders a single chat message with Framer Motion animation.
 * Shows text, file attachment, and sentiment badge.
 */

import React from 'react';
import { motion } from 'framer-motion';
import Avatar from '../ui/Avatar';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
}

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  neutral:  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  negative: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

const MessageBubble = React.memo(function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
}: MessageBubbleProps) {
  const alignment = isOwn ? 'items-end' : 'items-start';
  const bubbleBg  = isOwn
    ? 'bg-teal-600 text-white'
    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600';

  return (
    <motion.div
      className={`mb-2 flex flex-col gap-1 ${alignment}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {showAvatar && !isOwn && (
          <Avatar avatar_url={message.sender_avatar} name={message.sender_name} size="w-7 h-7" />
        )}

        <div className={`max-w-xs rounded-2xl px-3 py-2 shadow-sm lg:max-w-md ${bubbleBg}`}>
          {message.text && <p className="break-words text-sm">{message.text}</p>}

          {message.file_url && (
            <a
              href={message.file_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-xs underline opacity-80"
            >
              📎 Attachment
            </a>
          )}

          <p className={`mt-1 text-xs ${isOwn ? 'text-teal-100' : 'text-gray-400 dark:text-gray-500'}`}>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {message.sentiment_label && (
        <span
          className={[
            'rounded-full px-2 py-0.5 text-xs font-medium',
            SENTIMENT_BADGE[message.sentiment_label] ?? SENTIMENT_BADGE['neutral'],
            isOwn ? 'mr-2' : 'ml-9',
          ].join(' ')}
          aria-label={`Sentiment: ${message.sentiment_label}`}
        >
          {message.sentiment_label}
        </span>
      )}
    </motion.div>
  );
});

export default MessageBubble;

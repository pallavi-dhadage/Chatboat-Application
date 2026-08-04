/**
 * MessageBubble — renders a single chat message with Framer Motion animation.
 * Shows text, file attachment, and sentiment badge.
 */

import { motion } from 'framer-motion';
import Avatar from '../common/Avatar';

const SENTIMENT_BADGE = {
  positive: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  neutral:  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  negative: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

export default function MessageBubble({ message, isOwn, showAvatar = true }) {
  const alignment = isOwn ? 'items-end' : 'items-start';
  const bubbleBg  = isOwn
    ? 'bg-blue-600 text-white'
    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600';

  return (
    <motion.div
      className={`flex flex-col ${alignment} gap-1 mb-2`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {showAvatar && !isOwn && (
          <Avatar user={{ id: message.sender_id, name: message.sender_name }} size="sm" />
        )}

        <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl shadow-sm ${bubbleBg}`}>
          {message.text && <p className="text-sm break-words">{message.text}</p>}

          {message.file_url && (
            <a
              href={message.file_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs underline opacity-80 mt-1 block"
            >
              📎 Attachment
            </a>
          )}

          <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {message.sentiment_label && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${SENTIMENT_BADGE[message.sentiment_label] || SENTIMENT_BADGE.neutral}
                      ${isOwn ? 'mr-2' : 'ml-9'}`}
          aria-label={`Sentiment: ${message.sentiment_label}`}
        >
          {message.sentiment_label}
        </span>
      )}
    </motion.div>
  );
}

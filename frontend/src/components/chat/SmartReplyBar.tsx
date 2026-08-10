/**
 * SmartReplyBar — displays AI-generated reply suggestion chips.
 * Clicking a chip pre-fills the MessageInput.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SmartReplyBarProps } from './SmartReplyBar.d';

export default function SmartReplyBar({ replies = [], onSelect }: SmartReplyBarProps) {
  if (!replies || replies.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="flex gap-2 overflow-x-auto px-4 py-2"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        {replies.map((reply, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(reply)}
            className="shrink-0 whitespace-nowrap rounded-full border border-teal-200 bg-teal-50
                       px-3 py-1.5 text-sm text-teal-700 transition-colors
                       hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-900/30
                       dark:text-teal-300 dark:hover:bg-teal-800/50"
            aria-label={`Quick reply: ${reply}`}
          >
            {reply}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * SmartReplyBar — displays 2-3 AI-generated reply suggestion chips.
 * Clicking a chip pre-fills the MessageInput.
 */

import { motion, AnimatePresence } from 'framer-motion';

export default function SmartReplyBar({ replies = [], onSelect }) {
  if (!replies || replies.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="flex gap-2 px-4 py-2 overflow-x-auto"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        {replies.map((reply, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(reply)}
            className="shrink-0 px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-900/30
                       text-blue-700 dark:text-blue-300 border border-blue-200
                       dark:border-blue-700 rounded-full hover:bg-blue-100
                       dark:hover:bg-blue-800/50 transition-colors whitespace-nowrap"
            aria-label={`Quick reply: ${reply}`}
          >
            {reply}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

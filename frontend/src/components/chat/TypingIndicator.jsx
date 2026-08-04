/**
 * TypingIndicator — animated dots shown when another user is typing.
 */
import { motion } from 'framer-motion';

export default function TypingIndicator({ userId }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700
                      rounded-2xl">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gray-400 dark:bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay }}
          />
        ))}
      </div>
    </div>
  );
}

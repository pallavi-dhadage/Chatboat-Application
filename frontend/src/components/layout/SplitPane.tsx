/**
 * SplitPane — responsive two-column layout.
 */
import React from 'react';

interface SplitPaneProps {
  left: React.ReactNode;
  right?: React.ReactNode;
  showRight?: boolean;
}

export default function SplitPane({ left, right, showRight = false }: SplitPaneProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div
        className={[
          showRight ? 'hidden md:flex' : 'flex',
          'w-full shrink-0 flex-col border-r border-gray-200',
          'bg-white dark:border-gray-700 dark:bg-gray-800',
          'md:w-80 lg:w-96',
        ].join(' ')}
      >
        {left}
      </div>

      <div
        className={[
          showRight ? 'flex' : 'hidden md:flex',
          'flex-1 flex-col bg-gray-50 dark:bg-gray-900',
        ].join(' ')}
      >
        {right ?? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-600">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

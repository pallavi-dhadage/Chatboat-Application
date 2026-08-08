import React from 'react';
import Skeleton from '../ui/Skeleton';

/**
 * A single skeleton row representing one conversation entry.
 * Contains a circular avatar, a name line, and a shorter preview line.
 */
function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Circular avatar */}
      <Skeleton width="w-10" height="h-10" rounded="rounded-full" className="shrink-0" />

      {/* Name and preview lines */}
      <div className="flex flex-1 flex-col gap-2">
        {/* Sender name */}
        <Skeleton width="w-32" height="h-3" rounded="rounded" />
        {/* Message preview — shorter than the name */}
        <Skeleton width="w-48" height="h-3" rounded="rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder for the conversation list panel.
 * Renders five rows of circular avatar + name + preview skeletons.
 */
export const ConversationListSkeleton = React.memo(function ConversationListSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800" aria-hidden="true">
      <ConversationRowSkeleton />
      <ConversationRowSkeleton />
      <ConversationRowSkeleton />
      <ConversationRowSkeleton />
      <ConversationRowSkeleton />
    </div>
  );
});

export default ConversationListSkeleton;

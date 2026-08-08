import React from 'react';
import Skeleton from '../ui/Skeleton';

interface BubbleSkeletonProps {
  /** Aligns the bubble to the right when true, left when false */
  isOutgoing: boolean;
  /** Tailwind width class for the bubble (e.g. "w-48") */
  width: string;
}

/**
 * A single skeleton message bubble, aligned left (incoming) or right (outgoing).
 */
function BubbleSkeleton({ isOutgoing, width }: BubbleSkeletonProps) {
  return (
    <div className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      <Skeleton
        width={width}
        height="h-9"
        rounded="rounded-2xl"
        className={isOutgoing ? 'rounded-br-sm' : 'rounded-bl-sm'}
      />
    </div>
  );
}

/**
 * Skeleton placeholder for a message thread.
 * Renders alternating left- and right-aligned skeleton message bubbles of
 * varying widths to simulate a realistic conversation layout.
 */
export const MessageThreadSkeleton = React.memo(function MessageThreadSkeleton() {
  // Alternating pattern: false = incoming (left), true = outgoing (right)
  const bubbles: Array<{ isOutgoing: boolean; width: string }> = [
    { isOutgoing: false, width: 'w-48' },
    { isOutgoing: true,  width: 'w-36' },
    { isOutgoing: false, width: 'w-56' },
    { isOutgoing: true,  width: 'w-44' },
    { isOutgoing: false, width: 'w-40' },
    { isOutgoing: true,  width: 'w-52' },
    { isOutgoing: false, width: 'w-32' },
    { isOutgoing: true,  width: 'w-48' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4" aria-hidden="true">
      {bubbles.map((bubble, index) => (
        <BubbleSkeleton key={index} isOutgoing={bubble.isOutgoing} width={bubble.width} />
      ))}
    </div>
  );
});

export default MessageThreadSkeleton;

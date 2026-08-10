/**
 * ConversationList — sidebar list of conversations using React Query + Zustand.
 */
import React from 'react';
import { useChatStore } from '../../store/chatStore';
import { useConversations } from '../../hooks/useConversations';
import Avatar from '../ui/Avatar';
import type { Conversation } from '../../types';

interface ConversationListProps {
  /** Called with the conversation ID when the user selects a row */
  onSelect?: (id: string) => void;
}

export default function ConversationList({ onSelect }: ConversationListProps) {
  const { data: conversations = [], isLoading } = useConversations();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const handleSelect = (conv: Conversation) => {
    setActiveConversation(conv.id);
    onSelect?.(conv.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-gray-400 dark:text-gray-500">Loading…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Conversations</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className={[
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                'border-b border-gray-100 dark:border-gray-700',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                'hover:border-l-2 hover:border-teal-500',
                activeConversationId === conv.id
                  ? 'bg-navy-50 border-l-2 border-teal-500 dark:bg-navy-800'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Avatar avatar_url={null} name={conv.name} size="w-9 h-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {conv.name}
                </p>
                {conv.last_message && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {conv.last_message}
                  </p>
                )}
              </div>
              {conv.unread_count > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                  {conv.unread_count}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

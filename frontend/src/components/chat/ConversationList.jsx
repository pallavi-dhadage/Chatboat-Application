/**
 * ConversationList — sidebar list of conversations with unread badges and presence dots.
 */
import { useEffect } from 'react';
import { useChatStore } from '../../store/chatSlice';
import Avatar from '../common/Avatar';

export default function ConversationList({ onSelect }) {
  const { conversations, activeConvId, fetchConversations, presenceMap } = useChatStore();

  useEffect(() => { fetchConversations(); }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Conversations</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">No conversations yet</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect?.(conv.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                border-b border-gray-100 dark:border-gray-700
                ${activeConvId === conv.id
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <div className="relative">
                <Avatar user={{ id: conv.id, name: conv.name }} size="md" />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2
                  border-white dark:border-gray-800
                  ${presenceMap[conv.id] === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {conv.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{conv.type}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * FlaggedMessages — moderator/admin view of flagged content with dismiss action.
 */
import { useEffect, useState } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authSlice';
import toast from 'react-hot-toast';

export default function FlaggedMessages() {
  const { user }            = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  const canAccess = user?.role === 'moderator' || user?.role === 'admin';

  const fetchFlagged = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await client.get('/moderation/flagged', { params: { page: p, page_size: 20 } });
      setMessages(p === 1 ? data.messages : [...messages, ...data.messages]);
      setHasMore(p * 20 < data.total);
    } catch {
      toast.error('Failed to load flagged messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) fetchFlagged(1);
  }, []);

  const handleDismiss = async (messageId) => {
    try {
      await client.post(`/moderation/messages/${messageId}/dismiss`);
      setMessages((msgs) => msgs.filter((m) => m.id !== messageId));
      toast.success('Flag dismissed — message delivered');
    } catch {
      toast.error('Failed to dismiss flag');
    }
  };

  if (!canAccess) {
    return (
      <div className="p-8 text-center text-gray-500">
        Access restricted to moderators and admins.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Flagged Messages
          {messages.length > 0 && (
            <span className="ml-2 text-sm text-red-500">({messages.length})</span>
          )}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center">Loading…</p>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center">No flagged messages</p>
        )}

        {messages.map((msg) => (
          <div key={msg.id}
               className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border
                          border-red-200 dark:border-red-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">
                  Sender: {msg.sender_id} ·{' '}
                  <span className="text-red-600 font-medium">{msg.classification_label}</span>
                </p>
                <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                  {msg.text}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDismiss(msg.id)}
                className="shrink-0 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700
                           text-white rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => { const next = page + 1; setPage(next); fetchFlagged(next); }}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

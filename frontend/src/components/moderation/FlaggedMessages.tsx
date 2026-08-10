/**
 * FlaggedMessages — moderator/admin view of flagged content with dismiss action.
 */
import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface FlaggedMessage {
  id: string;
  sender_id: string;
  text: string;
  classification_label: string;
  created_at: string;
}

export default function FlaggedMessages() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  const canAccess = user?.role === 'moderator' || user?.role === 'admin';

  const fetchFlagged = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ messages: FlaggedMessage[]; total: number }>(
        '/moderation/flagged',
        { params: { page: p, page_size: 20 } },
      );
      setMessages((prev) => (p === 1 ? data.messages : [...prev, ...data.messages]));
      setHasMore(p * 20 < data.total);
    } catch {
      toast.error('Failed to load flagged messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) void fetchFlagged(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  const handleDismiss = async (messageId: string) => {
    try {
      await apiClient.post(`/moderation/messages/${messageId}/dismiss`);
      setMessages((msgs) => msgs.filter((m) => m.id !== messageId));
      toast.success('Flag dismissed');
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
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Flagged Messages
          {messages.length > 0 && (
            <span className="ml-2 text-sm text-red-500">({messages.length})</span>
          )}
        </h2>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading && messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">No flagged messages</p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-xl border border-red-200 bg-white p-4 shadow-sm
                       dark:border-red-800 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs text-gray-500">
                  Sender: {msg.sender_id} ·{' '}
                  <span className="font-medium text-red-600">{msg.classification_label}</span>
                </p>
                <p className="break-words text-sm text-gray-900 dark:text-gray-100">
                  {msg.text}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => void handleDismiss(msg.id)}
                className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs
                           text-white transition-colors hover:bg-green-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => {
              const next = page + 1;
              setPage(next);
              void fetchFlagged(next);
            }}
            className="w-full py-2 text-sm text-teal-600 hover:text-teal-700"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

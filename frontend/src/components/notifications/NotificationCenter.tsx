/**
 * NotificationCenter — persistent sidebar notification list.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationSlice';
import { useChatStore } from '../../store/chatStore';
import type { Notification } from '../../types';

export default function NotificationCenter() {
  const { notifications, unreadCount, fetchNotifications, markRead } = useNotificationStore();
  const { setActiveConversation } = useChatStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleClick = async (n: Notification) => {
    await markRead(n.id);
    const convId = (n.payload as Record<string, string>)?.conversation_id;
    if (convId) {
      setActiveConversation(convId);
      navigate('/chat');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b
                      border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">Notifications</h2>
        {unreadCount > 0 && (
          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-gray-500 text-center">No unread notifications</p>
        ) : (
          notifications.map((n: Notification) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700
                         border-b border-gray-100 dark:border-gray-700 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {String((n.payload as Record<string, unknown>)?.sender_name ?? 'New notification')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {String((n.payload as Record<string, unknown>)?.preview ?? n.type)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(n.created_at).toLocaleTimeString()}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

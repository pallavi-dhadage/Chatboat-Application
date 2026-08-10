/**
 * MessageInput — draft textarea with typing emit and send on Enter.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { apiClient } from '../../lib/apiClient';
import type { MessageInputProps } from './MessageInput.d';

export default function MessageInput({
  conversationId,
  onSmartReplySelect,
  prefillText = '',
  onClearPrefill,
}: MessageInputProps) {
  const [text, setText]       = useState(prefillText);
  const [sending, setSending] = useState(false);
  const { emit }              = useSocket();
  const typingTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accept prefill text from SmartReplyBar
  useEffect(() => {
    if (prefillText) {
      setText(prefillText);
      onClearPrefill?.();
    }
  }, [prefillText, onClearPrefill]);

  const emitTyping = useCallback(() => {
    if (!conversationId) return;
    emit('typing', { conversation_id: conversationId });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, [conversationId, emit]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || sending) return;
    setSending(true);
    emit('send_message', { conversation_id: conversationId, text: trimmed });
    setText('');
    setSending(false);
  }, [conversationId, emit, sending, text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await apiClient.post<{ url: string }>('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      emit('send_message', { conversation_id: conversationId, text: '', file_url: data.url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      alert(msg);
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <label
        className="cursor-pointer rounded-lg p-2 text-gray-400 transition-colors
                   hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        aria-label="Attach file"
      >
        📎
        <input
          type="file"
          className="hidden"
          onChange={(e) => void handleFileUpload(e)}
          accept="image/*,application/pdf,text/plain"
        />
      </label>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          emitTyping();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        rows={1}
        className="max-h-32 flex-1 resize-none overflow-y-auto rounded-xl border border-gray-300
                   bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2
                   focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        aria-label="Message input"
        style={{ minHeight: '40px' }}
      />

      <button
        onClick={() => void sendMessage()}
        disabled={!text.trim() || sending}
        className="rounded-xl bg-teal-600 p-2 text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
        aria-label="Send message"
      >
        ➤
      </button>
    </div>
  );
}

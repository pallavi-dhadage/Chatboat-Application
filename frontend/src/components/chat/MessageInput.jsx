/**
 * MessageInput — draft textarea with file upload, typing emit, and send on Enter.
 */
import { useState, useCallback, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import client from '../../api/client';

export default function MessageInput({ conversationId, onSmartReplySelect, prefillText, onClearPrefill }) {
  const [text, setText]     = useState(prefillText || '');
  const [sending, setSending] = useState(false);
  const { emit }            = useSocket();
  const typingTimerRef      = useRef(null);

  // Accept prefill from SmartReplyBar
  if (prefillText && text !== prefillText) {
    setText(prefillText);
    onClearPrefill?.();
  }

  const emitTyping = useCallback(() => {
    if (!conversationId) return;
    emit('typing', { conversation_id: conversationId });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, [conversationId, emit]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || sending) return;
    setSending(true);
    emit('send_message', { conversation_id: conversationId, text: trimmed });
    setText('');
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await client.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      emit('send_message', { conversation_id: conversationId, text: '', file_url: data.url });
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    }
  };

  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-800">
      <label className="cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
             aria-label="Attach file">
        📎
        <input type="file" className="hidden" onChange={handleFileUpload}
               accept="image/*,application/pdf,text/plain" />
      </label>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); emitTyping(); }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 resize-none px-3 py-2 rounded-xl border border-gray-300
                   dark:border-gray-600 bg-white dark:bg-gray-700 text-sm
                   text-gray-900 dark:text-white focus:outline-none focus:ring-2
                   focus:ring-blue-500 max-h-32 overflow-y-auto"
        aria-label="Message input"
        style={{ minHeight: '40px' }}
      />

      <button
        onClick={sendMessage}
        disabled={!text.trim() || sending}
        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                   text-white rounded-xl transition-colors"
        aria-label="Send message"
      >
        ➤
      </button>
    </div>
  );
}

/**
 * AIAssistant — RAG-powered support assistant panel.
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../../lib/apiClient';

interface AssistantMessage {
  role: 'assistant' | 'user';
  text: string;
  sources?: Array<{ title: string; score: number }>;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', text: 'Hi! Ask me anything about using the platform.' }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await apiClient.post<{ answer: string; sources?: Array<{ title: string; score: number }> }>('/ai/assistant', { query: q });
      setMessages((m) => [...m, { role: 'assistant', text: data.answer, sources: data.sources }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, the assistant is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h2>
        <p className="text-xs text-gray-500">Powered by RAG + Groq LLaMA</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm
              ${msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'}`}>
              {msg.text}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sources:</p>
                  {msg.sources.map((s, j) => (
                    <p key={j} className="text-xs text-gray-400">
                      {s.title} ({(s.score * 100).toFixed(0)}%)
                    </p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-500">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask a question…"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Assistant query input"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50
                     text-white rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

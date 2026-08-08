/**
 * ChatPage — full chat interface wiring React Query hooks, Socket.IO cache
 * updates, and existing chat sub-components.
 *
 * Validates: Requirements 10.4, 10.5, 12.3, 12.4, 12.5, 16.3, 16.4
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useConversations } from '../../hooks/useConversations';
import { useMessages } from '../../hooks/useMessages';
import { useSocket } from '../../hooks/useSocket';
import { queryClient } from '../../lib/queryClient';
import { queryKeys } from '../../lib/queryKeys';
import { ConversationListSkeleton } from '../../components/dashboard/ConversationListSkeleton';
import { MessageThreadSkeleton } from '../../components/dashboard/MessageThreadSkeleton';
import type { Message, PaginatedMessages } from '../../types';

// Lazy-load the heavy chat sub-components so this page chunk stays lean
const ConversationList = React.lazy(
  () => import('../../components/chat/ConversationList'),
);
const MessageThread = React.lazy(
  () => import('../../components/chat/MessageThread'),
);
const MessageInput = React.lazy(
  () => import('../../components/chat/MessageInput'),
);
const SmartReplyBar = React.lazy(
  () => import('../../components/chat/SmartReplyBar'),
);

/** Framer Motion variants for the fade-in / slide-up entrance used on new
 *  messages and panel transitions. Satisfies Requirement 10.5. */
const fadeSlideUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
} as const;

/** Panel entrance: the message area slides in when a conversation is selected. */
const panelVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: 'easeOut' } },
} as const;

export default function ChatPage() {
  const { conversationId: routeConvId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  // Local state for the active conversation (URL param takes precedence)
  const [activeConvId, setActiveConvId] = useState<string>(routeConvId ?? '');
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [prefillText, setPrefillText] = useState<string>('');

  // Sync URL param → local state when user navigates directly to /chat/:id
  useEffect(() => {
    if (routeConvId) setActiveConvId(routeConvId);
  }, [routeConvId]);

  // ── React Query hooks ────────────────────────────────────────────────────

  /**
   * Fetches the conversation list.
   * Req 12.3: render ConversationListSkeleton while isLoading.
   */
  const {
    isLoading: convsLoading,
    isError: convsError,
    refetch: refetchConvs,
  } = useConversations();

  /**
   * Fetches messages for the active conversation.
   * Req 12.3: render MessageThreadSkeleton while isLoading.
   * Req 12.4: render retry button on error.
   */
  const {
    isLoading: msgsLoading,
    isError: msgsError,
    refetch: refetchMsgs,
  } = useMessages(activeConvId);

  // ── Socket.IO — real-time cache updates (Req 12.5) ────────────────────

  const { on, off } = useSocket();

  /**
   * On every `new_message` event update the React Query cache directly so the
   * UI refreshes without a full network refetch.  Also mirror into smart-reply
   * suggestions when the message belongs to the active conversation.
   */
  const handleNewMessage = useCallback(
    (data: { message: Message; smart_replies?: string[] }) => {
      const msg = data.message;
      if (!msg?.conversation_id) return;

      // Update the paginated messages cache entry for this conversation
      queryClient.setQueryData<PaginatedMessages>(
        queryKeys.messages(msg.conversation_id),
        (prev) => {
          if (!prev) {
            return {
              messages: [msg],
              page: 1,
              page_size: 20,
              total: 1,
              has_next: false,
            };
          }
          // Avoid duplicate insertion (server may echo our own messages)
          const alreadyPresent = prev.messages.some((m) => m.id === msg.id);
          if (alreadyPresent) return prev;
          return {
            ...prev,
            messages: [...prev.messages, msg],
            total: prev.total + 1,
          };
        },
      );

      // Surface smart-reply suggestions when they arrive with the message
      if (
        msg.conversation_id === activeConvId &&
        Array.isArray(data.smart_replies) &&
        data.smart_replies.length > 0
      ) {
        setSmartReplies(data.smart_replies);
      }
    },
    [activeConvId],
  );

  useEffect(() => {
    on('new_message', handleNewMessage);
    return () => {
      off('new_message', handleNewMessage);
    };
  }, [on, off, handleNewMessage]);

  // ── Conversation selection ───────────────────────────────────────────

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConvId(id);
      setSmartReplies([]);
      setPrefillText('');
      navigate(`/chat/${id}`, { replace: true });
    },
    [navigate],
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Conversation List Panel ─────────────────────────────────── */}
      <aside
        className="flex w-72 shrink-0 flex-col border-r border-gray-200
                   bg-white dark:border-gray-700 dark:bg-gray-800"
        aria-label="Conversations"
      >
        {/* Req 16.3 — ConversationListSkeleton while loading */}
        {convsLoading ? (
          <motion.div
            key="conv-skeleton"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
          >
            <ConversationListSkeleton />
          </motion.div>
        ) : convsError ? (
          // Req 12.4 — inline error + retry
          <motion.div
            key="conv-error"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-3 p-6 text-center"
          >
            <p className="text-sm text-red-500 dark:text-red-400">
              Failed to load conversations.
            </p>
            <button
              onClick={() => refetchConvs()}
              className="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-medium
                         text-white transition-colors hover:bg-teal-600"
            >
              Retry
            </button>
          </motion.div>
        ) : (
          <React.Suspense fallback={<ConversationListSkeleton />}>
            <ConversationList onSelect={handleSelectConversation} />
          </React.Suspense>
        )}
      </aside>

      {/* ── Message Thread Panel ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeConvId ? (
          <motion.section
            key={activeConvId}
            className="flex flex-1 flex-col overflow-hidden"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            aria-label="Message thread"
          >
            {/* Req 16.4 — MessageThreadSkeleton while messages load */}
            {msgsLoading ? (
              <motion.div
                key="msg-skeleton"
                variants={fadeSlideUp}
                initial="hidden"
                animate="visible"
                className="flex-1 overflow-auto"
              >
                <MessageThreadSkeleton />
              </motion.div>
            ) : msgsError ? (
              // Req 12.4 — inline error + retry for message list
              <motion.div
                key="msg-error"
                variants={fadeSlideUp}
                initial="hidden"
                animate="visible"
                className="flex flex-1 flex-col items-center justify-center gap-3 p-6"
              >
                <p className="text-sm text-red-500 dark:text-red-400">
                  Failed to load messages.
                </p>
                <button
                  onClick={() => refetchMsgs()}
                  className="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-medium
                             text-white transition-colors hover:bg-teal-600"
                >
                  Retry
                </button>
              </motion.div>
            ) : (
              <React.Suspense fallback={<MessageThreadSkeleton />}>
                {/* MessageThread — Req 10.5: individual MessageBubble already
                    applies Framer Motion fade-in/slide-up (opacity 0→1, y 8→0,
                    duration 0.25 s) satisfying the new-message animation req. */}
                <MessageThread conversationId={activeConvId} />
              </React.Suspense>
            )}

            {/* Smart reply chips (Req 10.4 — hover/selection interaction) */}
            {smartReplies.length > 0 && (
              <React.Suspense fallback={null}>
                <SmartReplyBar
                  replies={smartReplies}
                  onSelect={(reply: string) => {
                    setPrefillText(reply);
                    setSmartReplies([]);
                  }}
                />
              </React.Suspense>
            )}

            {/* Message compose input */}
            <React.Suspense fallback={null}>
              <MessageInput
                conversationId={activeConvId}
                prefillText={prefillText}
                onClearPrefill={() => setPrefillText('')}
              />
            </React.Suspense>
          </motion.section>
        ) : (
          /* Empty state when no conversation is selected */
          <motion.div
            key="empty"
            className="flex flex-1 flex-col items-center justify-center gap-3
                       text-gray-400 dark:text-gray-500"
            variants={fadeSlideUp}
            initial="hidden"
            animate="visible"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03
                   8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512
                   15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">Select a conversation to start chatting</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * React Query mutation hook for sending a message in a conversation.
 */

import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';
import type { Message } from '../types';

/** Payload accepted by the `POST /conversations/{conversationId}/messages` endpoint. */
export interface SendMessagePayload {
  /** UUID of the conversation to post the message into. */
  conversationId: string;
  /** Text body of the message. Pass `null` for file-only messages. */
  text: string | null;
  /** Optional pre-uploaded file URL to attach. */
  file_url?: string | null;
}

/**
 * Sends a new message to a conversation via `POST /conversations/{conversationId}/messages`.
 *
 * On success the messages cache for that conversation is invalidated so React Query
 * refetches and the thread stays up-to-date (in addition to any real-time socket update).
 *
 * @returns A React Query mutation result that resolves to the created {@link Message}.
 *
 * @example
 * ```tsx
 * const sendMessage = useSendMessage();
 *
 * const handleSend = (text: string) => {
 *   sendMessage.mutate({ conversationId, text });
 * };
 * ```
 */
export function useSendMessage(): UseMutationResult<
  Message,
  Error,
  SendMessagePayload
> {
  return useMutation<Message, Error, SendMessagePayload>({
    mutationFn: ({ conversationId, text, file_url }) =>
      apiClient
        .post<Message>(`/conversations/${conversationId}/messages`, {
          text,
          file_url: file_url ?? null,
        })
        .then((r) => r.data),
    onSuccess: (_data, { conversationId }) => {
      // Invalidate the message list so the new message is fetched from the server.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages(conversationId),
      });
    },
  });
}

/**
 * Property test for Chat_Store addMessage append invariant.
 *
 * Property 2: For any initial messages state and any Message object,
 *   the array for that conversationId is exactly one element longer
 *   and its last element equals the appended message.
 *
 * Validates: Requirements 3.2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useChatStore } from '../../store/chatStore';
import type { Message } from '../../types';

const messageArbitrary = fc.record<Message>({
  id:              fc.uuid(),
  conversation_id: fc.uuid(),
  sender_id:       fc.uuid(),
  sender_name:     fc.string({ minLength: 1, maxLength: 50 }),
  sender_avatar:   fc.option(fc.webUrl(), { nil: null }),
  text:            fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  file_url:        fc.option(fc.webUrl(), { nil: null }),
  sentiment_label: fc.option(
    fc.constantFrom('positive' as const, 'neutral' as const, 'negative' as const),
    { nil: null },
  ),
  sentiment_score: fc.option(fc.float({ min: 0, max: 1 }), { nil: null }),
  flagged:         fc.boolean(),
  created_at:      fc.date().map((d) => d.toISOString()),
});

describe('Chat_Store — property tests', () => {
  beforeEach(() => {
    // Reset store
    useChatStore.setState({ messages: {}, conversations: [], activeConversationId: null, typingUsers: {} });
  });

  it('Property 2: addMessage appends exactly one element and last element equals the message', () => {
    fc.assert(
      fc.property(
        fc.uuid(),                             // conversationId
        fc.array(messageArbitrary, { maxLength: 10 }), // seed messages
        messageArbitrary,                      // message to append
        (conversationId, seedMessages, newMessage) => {
          // Seed initial state
          useChatStore.setState({
            messages: { [conversationId]: seedMessages },
          });

          const before = useChatStore.getState().messages[conversationId]?.length ?? 0;

          // Append the new message
          useChatStore.getState().addMessage(conversationId, newMessage);

          const after = useChatStore.getState().messages[conversationId];

          // Array is exactly one longer
          expect(after.length).toBe(before + 1);
          // Last element is the appended message
          expect(after[after.length - 1]).toEqual(newMessage);
        },
      ),
      { numRuns: 50 },
    );
  });
});

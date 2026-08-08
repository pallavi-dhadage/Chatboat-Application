/**
 * Type declarations for MessageInput.jsx
 */
import type React from 'react';

export interface MessageInputProps {
  /** UUID of the conversation to send messages to */
  conversationId: string;
  /** Optional text that pre-fills the input (e.g. from a smart reply chip) */
  prefillText?: string;
  /** Called after the prefill has been applied so the parent can clear it */
  onClearPrefill?: () => void;
  /** Called when a smart reply chip is selected */
  onSmartReplySelect?: (reply: string) => void;
}

declare const MessageInput: React.FC<MessageInputProps>;
export default MessageInput;

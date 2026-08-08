/**
 * Type declarations for MessageThread.jsx
 */
import type React from 'react';

export interface MessageThreadProps {
  /** UUID of the conversation whose messages to display */
  conversationId: string;
}

declare const MessageThread: React.FC<MessageThreadProps>;
export default MessageThread;

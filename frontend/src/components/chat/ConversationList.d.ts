/**
 * Type declarations for ConversationList.jsx
 * Minimal stub so TypeScript consumers can import the component.
 */
import type React from 'react';

export interface ConversationListProps {
  /** Called with the conversation ID when the user selects a conversation row */
  onSelect?: (id: string) => void;
}

declare const ConversationList: React.FC<ConversationListProps>;
export default ConversationList;

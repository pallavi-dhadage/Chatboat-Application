/**
 * Type declarations for SmartReplyBar.jsx
 */
import type React from 'react';

export interface SmartReplyBarProps {
  /** Array of suggested reply strings to display as chips */
  replies?: string[];
  /** Called with the selected reply string when a chip is clicked */
  onSelect: (reply: string) => void;
}

declare const SmartReplyBar: React.FC<SmartReplyBarProps>;
export default SmartReplyBar;

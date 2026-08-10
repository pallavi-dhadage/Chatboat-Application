import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from '../components/chat/MessageBubble';

const baseMessage = {
  id:              'msg-1',
  conversation_id: 'conv-1',
  sender_id:       'user-1',
  sender_name:     'Alice',
  sender_avatar:   null,
  text:            'Hello there!',
  file_url:        null,
  sentiment_label: null,
  sentiment_score: null,
  flagged:         false,
  created_at:      new Date().toISOString(),
};

describe('MessageBubble', () => {
  it('renders message text', () => {
    render(<MessageBubble message={baseMessage} isOwn={false} />);
    expect(screen.getByText('Hello there!')).toBeTruthy();
  });

  it('renders sentiment badge when sentiment_label is set', () => {
    const msg = { ...baseMessage, sentiment_label: 'positive' as const };
    render(<MessageBubble message={msg} isOwn={false} />);
    expect(screen.getByText('positive')).toBeTruthy();
  });

  it('does not render sentiment badge when no sentiment_label', () => {
    render(<MessageBubble message={baseMessage} isOwn={false} />);
    expect(screen.queryByText('positive')).toBeNull();
    expect(screen.queryByText('negative')).toBeNull();
  });

  it('renders file attachment link when file_url is present', () => {
    const msg = { ...baseMessage, file_url: 'https://s3.example.com/file.pdf' };
    render(<MessageBubble message={msg} isOwn={false} />);
    expect(screen.getByText('📎 Attachment')).toBeTruthy();
  });
});

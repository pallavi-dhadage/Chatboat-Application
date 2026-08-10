import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SmartReplyBar from '../components/chat/SmartReplyBar';

describe('SmartReplyBar', () => {
  it('renders reply chips', () => {
    render(<SmartReplyBar replies={['Sure!', 'Sounds good.', 'Let me check.']} onSelect={() => {}} />);
    expect(screen.getByText('Sure!')).toBeTruthy();
    expect(screen.getByText('Sounds good.')).toBeTruthy();
    expect(screen.getByText('Let me check.')).toBeTruthy();
  });

  it('calls onSelect with reply text when chip is clicked', () => {
    const onSelect = vi.fn();
    render(<SmartReplyBar replies={['Sure!', 'No thanks.']} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Sure!'));
    expect(onSelect).toHaveBeenCalledWith('Sure!');
  });

  it('renders nothing when replies array is empty', () => {
    const { container } = render(<SmartReplyBar replies={[]} onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when replies is undefined', () => {
    const { container } = render(<SmartReplyBar onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});

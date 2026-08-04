import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../components/common/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toBeTruthy();
  });

  it('adds dark class to <html> when toggled to dark', () => {
    localStorage.setItem('theme', 'light');
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('removes dark class from <html> when toggled to light', () => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('persists theme preference to localStorage', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    const stored = localStorage.getItem('theme');
    expect(['dark', 'light']).toContain(stored);
  });
});

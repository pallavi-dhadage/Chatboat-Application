/**
 * Property test for toast message length constraint.
 *
 * Property 15: For any arbitrary-length string passed to
 *   useToast().success/error/info, the string ultimately passed to
 *   react-hot-toast must have length ≤ 80.
 *
 * Validates: Requirements 14.5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock react-hot-toast before importing useToast
vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn((msg: string) => msg);
  toastFn.success = vi.fn((msg: string) => msg);
  toastFn.error   = vi.fn((msg: string) => msg);
  toastFn.info    = vi.fn((msg: string) => msg);
  return { default: toastFn };
});

import toast from 'react-hot-toast';
import { useToast } from '../../hooks/useToast';

describe('useToast — property tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Property 15: success messages passed to react-hot-toast are ≤ 80 chars', () => {
    const toastHelpers = useToast();
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (msg) => {
        toastHelpers.success(msg);
        const calls = (toast.success as ReturnType<typeof vi.fn>).mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall.length).toBeLessThanOrEqual(80);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15: error messages passed to react-hot-toast are ≤ 80 chars', () => {
    const toastHelpers = useToast();
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (msg) => {
        toastHelpers.error(msg);
        const calls = (toast.error as ReturnType<typeof vi.fn>).mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall.length).toBeLessThanOrEqual(80);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 15: info messages passed to react-hot-toast are ≤ 80 chars', () => {
    const toastHelpers = useToast();
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (msg) => {
        toastHelpers.info(msg);
        // info calls toast() directly (the default function)
        const calls = (toast as unknown as ReturnType<typeof vi.fn>).mock.calls;
        const lastCall = calls[calls.length - 1][0] as string;
        expect(lastCall.length).toBeLessThanOrEqual(80);
      }),
      { numRuns: 100 },
    );
  });
});

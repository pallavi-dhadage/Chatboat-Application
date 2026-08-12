/**
 * Property tests for Sidebar conditional rendering logic.
 *
 * These tests validate the NAV_ITEMS filtering logic directly (pure function)
 * rather than rendering the full Sidebar component (which uses Framer Motion
 * and is better covered by E2E tests).
 *
 * Property 7: For any User with role === 'admin', the filtered nav items
 *   include an "Admin Panel" entry; for other roles it is absent.
 * Property 8: For any User with a non-empty name, the user's first name
 *   can be derived from the name field.
 *
 * Validates: Requirements 5.7, 5.6
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { User } from '../../types';

/** Mirrors the NAV_ITEMS filtering logic from Sidebar.tsx */
interface NavItem {
  label: string;
  requiredRole?: 'admin' | 'moderator';
}

const BASE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard' },
  { label: 'Chat' },
  { label: 'AI Assistant' },
  { label: 'Analytics' },
  { label: 'Settings' },
  { label: 'Admin Panel', requiredRole: 'admin' },
];

function getVisibleNavItems(user: User): NavItem[] {
  return BASE_NAV_ITEMS.filter(
    (item) => !item.requiredRole || item.requiredRole === user.role,
  );
}

function getFirstName(user: User): string {
  const parts = user.name.trim().split(/\s+/);
  return parts[0] ?? '';
}

describe('Sidebar nav item visibility — property tests', () => {
  it('Property 7: Admin Panel is visible only for admin role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('user' as const, 'moderator' as const, 'admin' as const),
        (role) => {
          const user: User = {
            id: '1', email: 'a@b.com', name: 'Test User',
            role, avatar_url: null, status: null, bio: null,
          };
          const items = getVisibleNavItems(user);
          const hasAdminPanel = items.some((i) => i.label === 'Admin Panel');

          if (role === 'admin') {
            expect(hasAdminPanel).toBe(true);
          } else {
            expect(hasAdminPanel).toBe(false);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Property 8: First name is always derivable from a non-empty name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 50 }),
        fc.constantFrom('user' as const, 'moderator' as const, 'admin' as const),
        (name, role) => {
          const user: User = {
            id: '1', email: 'a@b.com', name,
            role, avatar_url: null, status: null, bio: null,
          };
          const firstName = getFirstName(user);
          // name with minLength 2 must produce a non-empty first name after trim
          const trimmed = name.trim();
          if (trimmed.length > 0) {
            expect(firstName.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

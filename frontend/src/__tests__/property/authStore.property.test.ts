/**
 * Property tests for Auth_Store setAuth / clearAuth invariants.
 *
 * Property 1: After setAuth(token, refreshToken, user):
 *   - isAuthenticated === true
 *   - store.token === token
 *   - store.refreshToken === refreshToken
 *   - store.user === user
 *
 * Property 2: After clearAuth():
 *   - isAuthenticated === false
 *   - store.token === null
 *   - store.refreshToken === null
 *   - store.user === null
 *
 * Validates: Requirements 3.1, 3.4
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// We import the store factory directly so each test gets a fresh instance.
// Zustand stores are singletons by default, so we reset state between tests.
import { useAuthStore } from '../../store/authStore';

const userArbitrary = fc.record({
  id:         fc.uuid(),
  email:      fc.emailAddress(),
  name:       fc.string({ minLength: 2, maxLength: 50 }),
  role:       fc.constantFrom('user' as const, 'moderator' as const, 'admin' as const),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  status:     fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  bio:        fc.option(fc.string({ maxLength: 500 }), { nil: null }),
});

describe('Auth_Store — property tests', () => {
  beforeEach(() => {
    // Reset store to initial unauthenticated state before each test
    useAuthStore.getState().clearAuth();
  });

  it('Property 1: setAuth sets isAuthenticated=true and persists all fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10 }),
        fc.string({ minLength: 10 }),
        userArbitrary,
        (token, refreshToken, user) => {
          useAuthStore.getState().setAuth(token, refreshToken, user);
          const state = useAuthStore.getState();

          expect(state.isAuthenticated).toBe(true);
          expect(state.token).toBe(token);
          expect(state.refreshToken).toBe(refreshToken);
          expect(state.user).toEqual(user);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 2: clearAuth resets all fields to null / false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10 }),
        fc.string({ minLength: 10 }),
        userArbitrary,
        (token, refreshToken, user) => {
          // First authenticate
          useAuthStore.getState().setAuth(token, refreshToken, user);
          // Then clear
          useAuthStore.getState().clearAuth();
          const state = useAuthStore.getState();

          expect(state.isAuthenticated).toBe(false);
          expect(state.token).toBeNull();
          expect(state.refreshToken).toBeNull();
          expect(state.user).toBeNull();
        },
      ),
      { numRuns: 50 },
    );
  });
});

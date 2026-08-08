import '@testing-library/jest-dom';

// jsdom does not implement window.matchMedia; provide a minimal stub so that
// components using it (e.g. ThemeToggle) do not throw during tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

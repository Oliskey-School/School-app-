import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock MatchMedia (needed by many UI libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock indexedDB for happy-dom/jsdom
const indexedDBMock = {
    open: vi.fn().mockReturnValue({
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
    }),
    deleteDatabase: vi.fn().mockReturnValue({
        onsuccess: null,
        onerror: null,
    }),
};

Object.defineProperty(window, 'indexedDB', {
    value: indexedDBMock,
});

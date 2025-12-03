import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { startMockServer, stopMockServer, resetMockHandlers } from './utils/mockApi';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia (required for some components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver (required for some components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// Mock ResizeObserver (required for cmdk/Command component)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

// Start MSW server before all tests
beforeAll(() => {
  startMockServer();
});

// Reset handlers after each test
afterEach(() => {
  resetMockHandlers();
});

// Stop MSW server after all tests
afterAll(() => {
  stopMockServer();
});

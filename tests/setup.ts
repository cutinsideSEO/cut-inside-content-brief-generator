import { vi, beforeEach } from 'vitest';

// Mock fetch globally for API tests
global.fetch = vi.fn();

// Mock btoa for DataForSEO auth (Node.js doesn't have btoa natively)
global.btoa = (str: string) => Buffer.from(str).toString('base64');

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * @fileoverview Shared test utilities to reduce duplication across test files.
 */

import { vi } from 'vitest';

/**
 * Sets up mock fetch for testing with automatic cleanup.
 * @returns Object with mockFetch function and cleanup utilities
 */
export function setupMockFetch() {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  const setup = () => {
    vi.resetAllMocks();
    globalThis.fetch = mockFetch;
  };

  const cleanup = () => {
    globalThis.fetch = originalFetch;
  };

  return { mockFetch, setup, cleanup };
}

/**
 * Creates a mock Response object for testing.
 * @param data - The response data to be JSON stringified
 * @param status - HTTP status code (default: 200)
 * @param headers - Additional headers (default: {})
 * @returns Mock Response object
 */
export function createMockResponse(
  data: unknown,
  status: number = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Clears all cookies in the document for testing.
 */
export function clearAllCookies() {
  document.cookie.split(';').forEach((c) => {
    const eqPos = c.indexOf('=');
    const name = eqPos > -1 ? c.substring(0, eqPos) : c;
    document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
}

/**
 * @fileoverview Test to verify README examples work correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for the tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('README Examples Validation', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Test User' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should work with default import as shown in README', async () => {
    // This tests the first example from README
    const api = (await import('../src/index')).default;

    const response = await api.get('/api/users');
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ id: 1, name: 'Test User' });
  });

  it('should work with custom authentication as shown in README', async () => {
    // This tests the second example from README
    const { FetchClient, useAuthentication } = await import('../src/index');

    const authClient = useAuthentication(new FetchClient(), {
      tokenProvider: () => 'test-token',
    });

    await authClient.get('http://example.com/api/profile');

    // Verify the Authorization header was added
    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com/api/profile',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('should export all the middleware mentioned in docs', async () => {
    const fetchLib = await import('../src/index');

    // Verify all middleware exports exist as documented
    expect(typeof fetchLib.useAuthentication).toBe('function');
    expect(typeof fetchLib.useCSRF).toBe('function');
    expect(typeof fetchLib.useAuthorization).toBe('function');
    expect(typeof fetchLib.useRetry).toBe('function');
    expect(typeof fetchLib.useCache).toBe('function');
    expect(typeof fetchLib.useLogging).toBe('function');
    expect(typeof fetchLib.useRateLimit).toBe('function');

    // Verify pre-built stacks
    expect(typeof fetchLib.useProductionStack).toBe('function');
    expect(typeof fetchLib.useDevelopmentStack).toBe('function');
    expect(typeof fetchLib.useBasicStack).toBe('function');
  });

  it('should have correct TypeScript types as documented', async () => {
    const { FetchClient } = await import('../src/index');

    interface TestUser {
      id: number;
      name: string;
    }

    const client = new FetchClient();
    const response = await client.get<TestUser>('/api/user');

    // This test verifies the response structure matches documentation
    if (response.ok) {
      expect(response.data).toBeTruthy();
      expect(typeof response.status).toBe('number');
    } else {
      expect(response.error).toBeTruthy();
      expect(typeof response.status).toBe('number');
    }
  });
});

/**
 * @fileoverview Test to verify README examples work correctly
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vite-plus/test';

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

  it('should work with the named client shown in README', async () => {
    const { FetchClient } = await import('../src/index');
    const api = new FetchClient({ baseUrl: 'https://api.example.com' });

    const response = await api.get('/users/1');
    expect(response.ok).toBe(true);
    expect(response.data).toEqual({ id: 1, name: 'Test User' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.objectContaining({
        credentials: 'same-origin',
      }),
    );
  });

  it('should work with custom authentication as shown in README', async () => {
    const { FetchClient } = await import('../src/index');
    const { addAuthentication } =
      await import('../src/middleware/authentication');

    const authClient = addAuthentication(new FetchClient(), {
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

  it('should work with throwOnError as shown in README', async () => {
    const { FetchClient, throwOnError } = await import('../src/index');
    const api = new FetchClient();

    const user = throwOnError(
      await api.get<{ id: number; name: string }>('/api/users/1'),
    );

    expect(user).toEqual({ id: 1, name: 'Test User' });
  });

  it('should export all the middleware mentioned in docs', async () => {
    const fetchLib = await import('../src/middleware');

    expect(typeof fetchLib.addAuthentication).toBe('function');
    expect(typeof fetchLib.addCSRF).toBe('function');
    expect(typeof fetchLib.addAuthorization).toBe('function');
    expect(typeof fetchLib.addRetry).toBe('function');
    expect(typeof fetchLib.addCache).toBe('function');
    expect(typeof fetchLib.addLogging).toBe('function');
    expect(typeof fetchLib.addRateLimit).toBe('function');
  });

  it('should expose ok/data/error branches as documented', async () => {
    const { FetchClient } = await import('../src/index');

    const client = new FetchClient();
    const response = await client.get<{ id: number; name: string }>(
      '/api/user',
    );

    if (response.ok) {
      expect(response.data).toEqual({ id: 1, name: 'Test User' });
      expect(response.error).toBeNull();
      expect(typeof response.status).toBe('number');
    } else {
      expect(response.error).toBeTruthy();
      expect(response.data).toBeNull();
      expect(typeof response.status).toBe('number');
    }
  });
});

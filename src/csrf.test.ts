import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from './client';
import { useCSRF } from './csrf';

describe('CSRF Middleware', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    globalThis.fetch = mockFetch;
    // Clear all cookies before each test
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.substring(0, eqPos) : c;
      document.cookie = `${name.trim()}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('adds CSRF token from cookie to headers', async () => {
    // Set up a CSRF token in cookies
    document.cookie = 'csrf_token=test-token-123; path=/';

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const client = new FetchClient();
    useCSRF(client, {
      cookieName: 'csrf_token',
      headerName: 'X-CSRF-Token',
    });

    await client.post('/api/data', { test: 'data' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-token-123',
        }),
      }),
    );
  });

  it('sets Content-Type to application/json', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const client = new FetchClient();
    useCSRF(client, {
      cookieName: 'csrf_token',
      headerName: 'X-CSRF-Token',
    });

    await client.get('/api/data');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('works without CSRF token in cookies', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const client = new FetchClient();
    useCSRF(client, {
      cookieName: 'csrf_token',
      headerName: 'X-CSRF-Token',
    });

    await client.get('/api/data');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );

    // Should not include the CSRF header if no token exists
    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers).not.toHaveProperty('X-CSRF-Token');
  });

  it('updates CSRF token from response headers', async () => {
    const responseHeaders = new Headers();
    responseHeaders.set('X-CSRF-Token', 'new-token-456');

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: responseHeaders,
      }),
    );

    const client = new FetchClient();
    useCSRF(client, {
      cookieName: 'csrf_token',
      headerName: 'X-CSRF-Token',
    });

    await client.get('/api/data');

    // Check that the cookie was updated
    expect(document.cookie).toContain('csrf_token=new-token-456');
  });

  it('preserves existing headers', async () => {
    document.cookie = 'csrf_token=test-token-123; path=/';

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const client = new FetchClient();

    // Add a request middleware that sets a custom header
    client.useRequestMiddleware(async (req, url) => {
      const headers = { ...req.headers, 'X-Custom': 'custom-value' };
      return [{ ...req, headers }, url];
    });

    useCSRF(client, {
      cookieName: 'csrf_token',
      headerName: 'X-CSRF-Token',
    });

    await client.get('/api/data');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-token-123',
          'X-Custom': 'custom-value',
        }),
      }),
    );
  });
});

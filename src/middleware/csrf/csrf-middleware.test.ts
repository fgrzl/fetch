import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FetchClient } from '../../client';
import {
  clearAllCookies,
  createMockResponse,
  setupMockFetch,
} from '../../utils/test-utils';
import { useCSRF } from './index';

describe('CSRF Middleware', () => {
  const { mockFetch, setup, cleanup } = setupMockFetch();

  beforeEach(() => {
    setup();
    clearAllCookies();
  });

  afterEach(cleanup);

  it('adds CSRF token from cookie to headers', async () => {
    // Set up a CSRF token in cookies
    document.cookie = 'CSRF_token=test-token-123; path=/';

    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

    const client = new FetchClient();
    useCSRF(client, {
      cookieName: 'CSRF_token',
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
      cookieName: 'CSRF_token',
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
      cookieName: 'CSRF_token',
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
      cookieName: 'CSRF_token',
      headerName: 'X-CSRF-Token',
    });

    await client.get('/api/data');

    // Check that the cookie was updated
    expect(document.cookie).toContain('CSRF_token=new-token-456');
  });

  it('preserves existing headers', async () => {
    document.cookie = 'CSRF_token=test-token-123; path=/';

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
      cookieName: 'CSRF_token',
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

  it('uses default XSRF-TOKEN cookie and X-XSRF-TOKEN header when no config provided', async () => {
    // Set up a CSRF token in default cookie
    document.cookie = 'XSRF-TOKEN=default-token-789; path=/';

    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

    const client = new FetchClient();
    useCSRF(client, {});

    await client.post('/api/data', { test: 'data' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': 'default-token-789',
        }),
      }),
    );
  });

  it('can be called without any config parameter', async () => {
    document.cookie = 'XSRF-TOKEN=no-config-token; path=/';

    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

    const client = new FetchClient();
    useCSRF(client);

    await client.post('/api/data', { test: 'data' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': 'no-config-token',
        }),
      }),
    );
  });

  it('updates default XSRF-TOKEN cookie from response headers', async () => {
    const responseHeaders = new Headers();
    responseHeaders.set('X-XSRF-TOKEN', 'new-default-token');

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: responseHeaders,
      }),
    );

    const client = new FetchClient();
    useCSRF(client, {});

    await client.get('/api/data');

    // Check that the default cookie was updated
    expect(document.cookie).toContain('XSRF-TOKEN=new-default-token');
  });
});

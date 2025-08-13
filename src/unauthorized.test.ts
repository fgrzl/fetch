import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from './client';
import { useUnauthorized } from './unauthorized';
import { setupMockFetch, createMockResponse } from './test-utils';

// Mock window.location
const mockLocation = {
  pathname: '/current-page',
  search: '?param=value',
  href: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('Unauthorized Middleware', () => {
  const { mockFetch, setup, cleanup } = setupMockFetch();

  beforeEach(() => {
    setup();
    mockLocation.href = '';
    mockLocation.pathname = '/current-page';
    mockLocation.search = '?param=value';
  });

  afterEach(cleanup);

  it('redirects to login page on 401 response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useUnauthorized(client, {
      loginPath: '/login',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      // The error should still be thrown after redirect
    }

    expect(mockLocation.href).toBe(
      '/login?returnTo=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('does not redirect on non-401 responses', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 }),
    );

    const client = new FetchClient();
    useUnauthorized(client, {
      loginPath: '/login',
    });

    try {
      await client.get('/api/data');
    } catch (error) {
      // Expected to throw
    }

    expect(mockLocation.href).toBe('');
  });

  it('does not redirect on successful responses', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const client = new FetchClient();
    useUnauthorized(client, {
      loginPath: '/login',
    });

    const result = await client.get('/api/data');

    expect(result.data).toEqual({ success: true });
    expect(result.ok).toBe(true);
    expect(mockLocation.href).toBe('');
  });

  it('handles different login paths', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useUnauthorized(client, {
      loginPath: '/auth/signin',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      // Expected to throw
    }

    expect(mockLocation.href).toBe(
      '/auth/signin?returnTo=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('handles current path without search params', async () => {
    mockLocation.pathname = '/dashboard';
    mockLocation.search = '';

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useUnauthorized(client, {
      loginPath: '/login',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      // Expected to throw
    }

    expect(mockLocation.href).toBe('/login?returnTo=%2Fdashboard');
  });

  it('works with other response middleware', async () => {
    const responseMiddleware = vi.fn(async (res) => res);

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    client.useResponseMiddleware(responseMiddleware);
    useUnauthorized(client, {
      loginPath: '/login',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      // Expected to throw
    }

    expect(responseMiddleware).toHaveBeenCalledTimes(1);
    expect(mockLocation.href).toBe(
      '/login?returnTo=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });
});

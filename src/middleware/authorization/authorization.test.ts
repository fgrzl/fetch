import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchClient } from '../../client';
import { setupMockFetch, createMockResponse } from '../../utils/test';
import { useAuthorization } from './index';

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

describe('Authorization Middleware', () => {
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
    useAuthorization(client, {
      url: '/login',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // The error should still be thrown after redirect
    }

    expect(mockLocation.href).toBe(
      '/login?redirect_uri=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('does not redirect on non-401 responses', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 }),
    );

    const client = new FetchClient();
    useAuthorization(client, {
      url: '/login',
    });

    try {
      await client.get('/api/data');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(mockLocation.href).toBe('');
  });

  it('does not redirect on successful responses', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

    const client = new FetchClient();
    useAuthorization(client, {
      url: '/login',
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
    useAuthorization(client, {
      url: '/auth/signin',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(mockLocation.href).toBe(
      '/auth/signin?redirect_uri=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('handles current path without search params', async () => {
    mockLocation.pathname = '/dashboard';
    mockLocation.search = '';

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useAuthorization(client, {
      url: '/login',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(mockLocation.href).toBe('/login?redirect_uri=%2Fdashboard');
  });

  it('works with other response middleware', async () => {
    const responseMiddleware = vi.fn(async (req, res) => res);

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    client.useResponseMiddleware(responseMiddleware);
    useAuthorization(client, {
      url: '/login',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(responseMiddleware).toHaveBeenCalledTimes(1);
    expect(mockLocation.href).toBe(
      '/login?redirect_uri=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('uses custom return parameter name when specified', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useAuthorization(client, {
      url: '/login',
      param: 'redirect_uri',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(mockLocation.href).toBe(
      '/login?redirect_uri=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('uses default redirect_uri parameter when param is not specified', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useAuthorization(client, {
      url: '/login',
    });

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(mockLocation.href).toBe(
      '/login?redirect_uri=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('uses all defaults when no config is provided', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useAuthorization(client, {});

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(mockLocation.href).toBe(
      '/login?redirect_uri=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });

  it('can be called without any config parameter', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new FetchClient();
    useAuthorization(client);

    try {
      await client.get('/api/protected');
    } catch (error) {
      console.log(error);
      // Expected to throw
    }

    expect(mockLocation.href).toBe(
      '/login?redirect_uri=%2Fcurrent-page%3Fparam%3Dvalue',
    );
  });
});

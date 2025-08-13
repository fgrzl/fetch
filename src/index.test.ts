import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { FetchClient, RequestMiddleware, ResponseMiddleware } from './client';
import api from './index';
import { createMockResponse, setupMockFetch } from './utils/test';

describe('Default API Instance', () => {
  it('exports a configured FetchClient instance', () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.patch).toBe('function');
    expect(typeof api.delete).toBe('function');
    expect(typeof api.del).toBe('function'); // deprecated but still available
  });

  it('exports error classes', async () => {
    const { FetchError, HttpError, NetworkError } = await import('./index');

    expect(FetchError).toBeDefined();
    expect(HttpError).toBeDefined();
    expect(NetworkError).toBeDefined();

    // Verify they are constructors
    expect(typeof FetchError).toBe('function');
    expect(typeof HttpError).toBe('function');
    expect(typeof NetworkError).toBe('function');
  });

  it('exports client classes and utilities', async () => {
    const { FetchClient, useCSRF, useAuthorization } = await import('./index');

    expect(FetchClient).toBeDefined();
    expect(useCSRF).toBeDefined();
    expect(useAuthorization).toBeDefined();

    expect(typeof FetchClient).toBe('function');
    expect(typeof useCSRF).toBe('function');
    expect(typeof useAuthorization).toBe('function');
  });
});

describe('FetchClient', () => {
  const { mockFetch, setup, cleanup } = setupMockFetch();

  beforeEach(setup);
  afterAll(cleanup);

  it('calls fetch with correct method and URL', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ message: 'ok' }));

    const client = new FetchClient();
    const result = await client.get<{ message: string }>('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.data.message).toBe('ok');
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('makes POST requests correctly', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1 }));

    const client = new FetchClient();
    const body = { name: 'Test User' };
    const result = await client.post<{ id: number }>('/users', body);

    expect(mockFetch).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
    expect(result.data.id).toBe(1);
  });

  it('makes PUT requests correctly', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ updated: true }));

    const client = new FetchClient();
    const body = { name: 'Updated User' };
    const result = await client.put<{ updated: boolean }>('/users/1', body);

    expect(mockFetch).toHaveBeenCalledWith(
      '/users/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    );
    expect(result.data.updated).toBe(true);
  });

  it('makes DELETE requests correctly', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ deleted: true }));

    const client = new FetchClient();
    const result = await client.delete<{ deleted: boolean }>('/users/1');

    expect(mockFetch).toHaveBeenCalledWith(
      '/users/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(result.data.deleted).toBe(true);
  });

  it('applies request middleware', async () => {
    const mw: RequestMiddleware = async (req, url) => {
      const headers = { ...req.headers, 'X-Test': '123' };
      return [{ ...req, headers }, `${url}?extra=1`];
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ done: true }), { status: 200 }),
    );

    const client = new FetchClient();
    client.useRequestMiddleware(mw);
    await client.get('/original');

    expect(mockFetch).toHaveBeenCalledWith(
      '/original?extra=1',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Test': '123' }),
      }),
    );
  });

  it('applies multiple request middlewares in order', async () => {
    const mw1: RequestMiddleware = async (req, url) => {
      const headers = { ...req.headers, 'X-First': '1' };
      return [{ ...req, headers }, `${url}?first=1`];
    };

    const mw2: RequestMiddleware = async (req, url) => {
      const headers = { ...req.headers, 'X-Second': '2' };
      return [{ ...req, headers }, `${url}&second=2`];
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ done: true }), { status: 200 }),
    );

    const client = new FetchClient();
    client.useRequestMiddleware(mw1);
    client.useRequestMiddleware(mw2);
    await client.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/test?first=1&second=2',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-First': '1',
          'X-Second': '2',
        }),
      }),
    );
  });

  it('applies response middleware', async () => {
    const mw: ResponseMiddleware = async (req, res) => {
      return res;
    };

    mockFetch.mockResolvedValueOnce(createMockResponse({ done: true }));

    const client = new FetchClient();
    client.useResponseMiddleware(mw);
    const res = await client.get<{ done: boolean }>('/ok');
    expect(res.data.done).toBe(true);
  });

  it('applies multiple response middlewares in order', async () => {
    const mw1: ResponseMiddleware = vi.fn(async (req, res) => res);
    const mw2: ResponseMiddleware = vi.fn(async (req, res) => res);

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ done: true }), { status: 200 }),
    );

    const client = new FetchClient();
    client.useResponseMiddleware(mw1);
    client.useResponseMiddleware(mw2);
    await client.get('/ok');

    expect(mw1).toHaveBeenCalledBefore(mw2 as any);
    expect(mw1).toHaveBeenCalledTimes(1);
    expect(mw2).toHaveBeenCalledTimes(1);
  });

  it('returns error information when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ error: 'fail' }, 400));

    const client = new FetchClient();
    const response = await client.get('/bad');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    expect(response.error?.body).toEqual({ error: 'fail' });
  });

  it('returns error information on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    const client = new FetchClient();
    const response = await client.get('/network-fail');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(0);
    expect(response.statusText).toBe('Network Error');
    expect(response.error?.message).toBe('Failed to fetch');
  });

  it('handles non-JSON error responses', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    const client = new FetchClient();
    const response = await client.get('/server-error');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    expect(response.error?.body).toBe('Server Error');
  });

  it('uses custom credentials setting', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const client = new FetchClient({ credentials: 'include' });
    await client.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('defaults to same-origin credentials', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const client = new FetchClient();
    await client.get('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('re-throws non-HTTP errors as-is', async () => {
    const customError = new Error('Custom error');
    mockFetch.mockRejectedValueOnce(customError);

    const client = new FetchClient();

    try {
      await client.get('/error');
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBe(customError);
    }
  });
});

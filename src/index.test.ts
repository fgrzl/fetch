import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FetchClient, RequestMiddleware, ResponseMiddleware } from './client';
import { HttpError, NetworkError } from './errors';
import { setupMockFetch, createMockResponse } from './test-utils';

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
    expect(result.message).toBe('ok');
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
    expect(result.id).toBe(1);
  });

  it('makes PUT requests correctly', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ updated: true }), { status: 200 }),
    );

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
    expect(result.updated).toBe(true);
  });

  it('makes DELETE requests correctly', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ deleted: true }), { status: 200 }),
    );

    const client = new FetchClient();
    const result = await client.del<{ deleted: boolean }>('/users/1');

    expect(mockFetch).toHaveBeenCalledWith(
      '/users/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(result.deleted).toBe(true);
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
    const mw: ResponseMiddleware = async (res) => {
      return res;
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ done: true }), { status: 200 }),
    );

    const client = new FetchClient();
    client.useResponseMiddleware(mw);
    const res = await client.get<{ done: boolean }>('/ok');
    expect(res.done).toBe(true);
  });

  it('applies multiple response middlewares in order', async () => {
    const mw1: ResponseMiddleware = vi.fn(async (res) => res);
    const mw2: ResponseMiddleware = vi.fn(async (res) => res);

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

  it('throws when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'fail' }), { status: 400 }),
    );

    const client = new FetchClient();

    try {
      await client.get('/bad');
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(400);
      expect((error as HttpError).body).toEqual({ error: 'fail' });
    }
  });

  it('throws NetworkError on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

    const client = new FetchClient();

    try {
      await client.get('/network-fail');
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).message).toContain(
        'Network error for /network-fail',
      );
    }
  });

  it('handles non-JSON error responses', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Server Error', { status: 500 }),
    );

    const client = new FetchClient();

    try {
      await client.get('/server-error');
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(500);
      expect((error as HttpError).body).toEqual({});
    }
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

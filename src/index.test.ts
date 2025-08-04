import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FetchClient, RequestMiddleware, ResponseMiddleware } from './client';
import { HttpError } from './errors';

describe('FetchClient', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls fetch with correct method and URL', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'ok' }), { status: 200 }),
    );

    const client = new FetchClient();
    const result = await client.get<{ message: string }>('/test');

    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.message).toBe('ok');
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
});

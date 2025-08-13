/**
 * @fileoverview Tests for the enhanced FetchClient.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from './fetch-client';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FetchClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should create a client instance', () => {
    const client = new FetchClient();
    expect(client).toBeInstanceOf(FetchClient);
  });

  it('should make GET requests', async () => {
    const client = new FetchClient();

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await client.get('/api/users');

    expect(mockFetch).toHaveBeenCalledWith('/api/users', {
      credentials: 'same-origin',
      method: 'GET',
    });
    expect(result.data).toEqual({ id: 1 });
    expect(result.ok).toBe(true);
  });

  it('should make POST requests with JSON body', async () => {
    const client = new FetchClient();

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1, name: 'John' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await client.post('/api/users', { name: 'John' });

    expect(mockFetch).toHaveBeenCalledWith('/api/users', {
      credentials: 'same-origin',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }),
    });
    expect(result.data).toEqual({ id: 1, name: 'John' });
  });

  it('should support basic middleware', async () => {
    const client = new FetchClient();

    let middlewareExecuted = false;
    client.use((request, next) => {
      middlewareExecuted = true;
      return next(request);
    });

    mockFetch.mockResolvedValueOnce(
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await client.get('/api/test');

    expect(middlewareExecuted).toBe(true);
  });

  it('should support all HTTP methods', async () => {
    const client = new FetchClient();

    // Create fresh mock responses for each call to avoid body already read error
    const createMockResponse = () =>
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    mockFetch
      .mockResolvedValueOnce(createMockResponse())
      .mockResolvedValueOnce(createMockResponse())
      .mockResolvedValueOnce(createMockResponse())
      .mockResolvedValueOnce(createMockResponse())
      .mockResolvedValueOnce(createMockResponse())
      .mockResolvedValueOnce(createMockResponse());

    await client.get('/test');
    await client.post('/test', {});
    await client.put('/test', {});
    await client.patch('/test', {});
    await client.del('/test');

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });

  it('should handle configuration options', () => {
    const client = new FetchClient({ credentials: 'include' });
    expect(client).toBeInstanceOf(FetchClient);
  });
});

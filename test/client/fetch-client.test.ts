/**
 * @fileoverview Tests for the enhanced FetchClient.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../../src/client/fetch-client';

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

  describe('Base URL functionality', () => {
    describe('with baseUrl configured', () => {
      it('should prepend baseUrl to relative URLs', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('/users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should handle relative URLs without leading slash', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should remove trailing slash from baseUrl', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com/' });

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('/users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should use absolute URLs as-is', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('https://other-api.com/data');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://other-api.com/data',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should work with query parameters', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('/users', { page: 1, limit: 10 });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users?page=1&limit=10',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should work with POST requests', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 1 }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.post('/users', { name: 'John' });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'John' }),
          }),
        );
      });

      it('should work with all HTTP methods', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        const createMockResponse = () =>
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });

        mockFetch
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

        expect(mockFetch).toHaveBeenNthCalledWith(
          1,
          'https://api.example.com/test',
          expect.objectContaining({ method: 'GET' }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          2,
          'https://api.example.com/test',
          expect.objectContaining({ method: 'POST' }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          3,
          'https://api.example.com/test',
          expect.objectContaining({ method: 'PUT' }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          4,
          'https://api.example.com/test',
          expect.objectContaining({ method: 'PATCH' }),
        );
        expect(mockFetch).toHaveBeenNthCalledWith(
          5,
          'https://api.example.com/test',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });

    describe('without baseUrl configured', () => {
      it('should allow absolute URLs', async () => {
        const client = new FetchClient();

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('https://api.example.com/users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should allow relative URLs (backward compatibility)', async () => {
        const client = new FetchClient();

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('/users');

        expect(mockFetch).toHaveBeenCalledWith(
          '/users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should allow relative URLs without leading slash (backward compatibility)', async () => {
        const client = new FetchClient();

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('users');

        expect(mockFetch).toHaveBeenCalledWith(
          'users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should handle query parameters with relative URLs', async () => {
        const client = new FetchClient();

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('/users', { page: 1 });

        expect(mockFetch).toHaveBeenCalledWith(
          '/users?page=1',
          expect.objectContaining({ method: 'GET' }),
        );
      });
    });

    describe('middleware compatibility', () => {
      it('should work with middleware', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        // Add a simple middleware that adds a header
        client.use(async (request, next) => {
          request.headers = { ...request.headers, 'X-Test': 'middleware' };
          return next(request);
        });

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        await client.get('/users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'X-Test': 'middleware',
            }),
          }),
        );
      });
    });

    describe('setBaseUrl method', () => {
      it('should allow setting base URL after construction', async () => {
        const client = new FetchClient();

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        client.setBaseUrl('https://api.example.com');
        await client.get('/users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({
            method: 'GET',
          }),
        );
      });

      it('should allow updating base URL', async () => {
        const client = new FetchClient({
          baseUrl: 'https://old-api.example.com',
        });

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        // First request with original base URL
        await client.get('/users');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://old-api.example.com/users',
          expect.objectContaining({ method: 'GET' }),
        );

        // Update base URL
        client.setBaseUrl('https://new-api.example.com');
        await client.get('/users');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://new-api.example.com/users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should allow clearing base URL', async () => {
        const client = new FetchClient({ baseUrl: 'https://api.example.com' });

        mockFetch.mockResolvedValue(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        // Clear base URL
        client.setBaseUrl(undefined);
        await client.get('https://external-api.com/users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://external-api.com/users',
          expect.objectContaining({ method: 'GET' }),
        );
      });

      it('should return client instance for method chaining', () => {
        const client = new FetchClient();
        const result = client.setBaseUrl('https://api.example.com');
        expect(result).toBe(client);
      });

      it('should work with middleware chains', async () => {
        const client = new FetchClient();

        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

        // Chain middleware and setBaseUrl
        client
          .use((request, next) => {
            request.headers = { ...request.headers, 'X-Test': 'chaining' };
            return next(request);
          })
          .setBaseUrl('https://api.example.com');

        await client.get('/users');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/users',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'X-Test': 'chaining',
            }),
          }),
        );
      });
    });

    describe('error handling', () => {
      it('should throw error when resolving relative URL with invalid base URL', async () => {
        const client = new FetchClient({ baseUrl: 'not-a-valid-url' });

        await expect(client.get('/users')).rejects.toThrow('Invalid URL');
      });
    });
  });
});

/**
 * @fileoverview Test operation ID with middleware to verify browser behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../src/client/fetch-client';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Operation ID with Middleware', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should preserve x-operation-id header when middleware is present', async () => {
    const client = new FetchClient();
    const operationId = 'test-op-with-middleware';

    // Add middleware that modifies request
    client.use(async (request, next) => {
      // Middleware that adds another header
      request.headers = {
        ...request.headers,
        'X-Custom': 'custom-value',
      };
      return next(request);
    });

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await client.get('/api/test', {}, { operationId });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        'x-operation-id': operationId,
        'X-Custom': 'custom-value',
      },
    });
  });

  it('should preserve x-operation-id when middleware does not modify headers', async () => {
    const client = new FetchClient();
    const operationId = 'test-op-passthrough';

    // Add middleware that passes through without modification
    client.use(async (request, next) => {
      return next(request);
    });

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await client.get('/api/test', {}, { operationId });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        'x-operation-id': operationId,
      },
    });
  });

  it('should preserve x-operation-id with multiple middleware', async () => {
    const client = new FetchClient();
    const operationId = 'test-op-multi';

    // Add multiple middleware
    client.use(async (request, next) => {
      request.headers = {
        ...request.headers,
        'X-Middleware-1': 'value1',
      };
      return next(request);
    });

    client.use(async (request, next) => {
      request.headers = {
        ...request.headers,
        'X-Middleware-2': 'value2',
      };
      return next(request);
    });

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await client.get('/api/test', {}, { operationId });

    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        'x-operation-id': operationId,
        'X-Middleware-1': 'value1',
        'X-Middleware-2': 'value2',
      },
    });
  });
});

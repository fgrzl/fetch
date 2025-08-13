/**
 * @fileoverview Tests for retry middleware.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../../src/client/fetch-client';
import { useRetry, createRetryMiddleware } from '../../../src/middleware/retry/index';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Retry Middleware', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useRetry (Pit of Success API)', () => {
    it('should add retry middleware with default options', async () => {
      const client = new FetchClient();
      const result = useRetry(client);

      // Should return the client for chaining
      expect(result).toBe(client);
    });

    it('should retry failed requests', async () => {
      const client = new FetchClient();
      useRetry(client, { delay: 100 });

      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const requestPromise = client.get('/api/test');

      // Fast-forward the retry delay
      await vi.runAllTimersAsync();

      const result = await requestPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ success: true });
      expect(result.ok).toBe(true);
    });

    it('should retry 5xx server errors', async () => {
      const client = new FetchClient();
      useRetry(client, { maxRetries: 1, delay: 50 });

      // First call returns 500, second succeeds
      mockFetch
        .mockResolvedValueOnce(
          new Response('Server Error', {
            status: 500,
            statusText: 'Internal Server Error',
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const requestPromise = client.get('/api/test');

      await vi.runAllTimersAsync();

      const result = await requestPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
    });

    it('should not retry 4xx client errors by default', async () => {
      const client = new FetchClient();
      useRetry(client);

      mockFetch.mockResolvedValueOnce(
        new Response('Not Found', {
          status: 404,
          statusText: 'Not Found',
        }),
      );

      const result = await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
    });

    it('should respect maxRetries option', async () => {
      const client = new FetchClient();
      useRetry(client, { maxRetries: 2, delay: 10 });

      // Always fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      const requestPromise = client.get('/api/test');

      await vi.runAllTimersAsync();

      const result = await requestPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 original + 2 retries
      expect(result.ok).toBe(false);
    });

    it('should call onRetry callback', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      useRetry(client, { maxRetries: 1, delay: 100, onRetry });

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const requestPromise = client.get('/api/test');

      await vi.runAllTimersAsync();
      await requestPromise;

      expect(onRetry).toHaveBeenCalledWith(1, 100, {
        status: 0,
        statusText: 'Network Error',
      });
    });
  });

  describe('createRetryMiddleware (Direct API)', () => {
    it('should work with exponential backoff', async () => {
      const client = new FetchClient();
      client.use(
        createRetryMiddleware({
          maxRetries: 2,
          delay: 100,
          backoff: 'exponential',
        }),
      );

      const onRetry = vi.fn();
      client.use(createRetryMiddleware({ onRetry, delay: 100 }));

      mockFetch
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(new Response('{}', { status: 200 }));

      const requestPromise = client.get('/api/test');

      await vi.runAllTimersAsync();
      await requestPromise;

      // Should have been called for each retry
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should support custom shouldRetry function', async () => {
      const client = new FetchClient();
      const shouldRetry = vi.fn().mockReturnValue(false);

      client.use(createRetryMiddleware({ shouldRetry }));

      mockFetch.mockResolvedValueOnce(
        new Response('Server Error', {
          status: 500,
        }),
      );

      await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith({ status: 500, ok: false }, 1);
    });
  });

  describe('Backoff Strategies', () => {
    it('should use exponential backoff by default', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      client.use(
        createRetryMiddleware({
          maxRetries: 3,
          delay: 100,
          backoff: 'exponential',
          onRetry,
        }),
      );

      mockFetch.mockRejectedValue(new Error('Always fails'));

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      await requestPromise;

      // Check that delays follow exponential pattern
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.anything());
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, expect.anything());
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, 400, expect.anything());
    });

    it('should use linear backoff', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      client.use(
        createRetryMiddleware({
          maxRetries: 3,
          delay: 100,
          backoff: 'linear',
          onRetry,
        }),
      );

      mockFetch.mockRejectedValue(new Error('Always fails'));

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      await requestPromise;

      // Check that delays follow linear pattern
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.anything());
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, expect.anything());
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, 300, expect.anything());
    });
  });
});

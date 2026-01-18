/**
 * @fileoverview Tests for retry middleware.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../../src/client/fetch-client';
import {
  addRetry,
  createRetryMiddleware,
} from '../../../src/middleware/retry/index';

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

  describe('addRetry (Pit of Success API)', () => {
    it('should add retry middleware with default options', async () => {
      const client = new FetchClient();
      const result = addRetry(client);

      // Should return the client for chaining
      expect(result).toBe(client);
    });

    it('should retry failed requests', async () => {
      const client = new FetchClient();
      addRetry(client, { delay: 100 });

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
      addRetry(client, { maxRetries: 1, delay: 50 });

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
      addRetry(client);

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
      addRetry(client, { maxRetries: 2, delay: 10 });

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

      addRetry(client, { maxRetries: 1, delay: 100, onRetry });

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

    it('should use fixed backoff', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      client.use(
        createRetryMiddleware({
          maxRetries: 3,
          delay: 500,
          backoff: 'fixed',
          onRetry,
        }),
      );

      mockFetch.mockRejectedValue(new Error('Always fails'));

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      await requestPromise;

      // Check that delays are always the same (fixed)
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 500, expect.anything());
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 500, expect.anything());
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, 500, expect.anything());
    });

    it('should respect maxDelay constraint', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      client.use(
        createRetryMiddleware({
          maxRetries: 5,
          delay: 1000,
          backoff: 'exponential',
          maxDelay: 2500, // Cap at 2.5 seconds
          onRetry,
        }),
      );

      mockFetch.mockRejectedValue(new Error('Always fails'));

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      await requestPromise;

      // Check that delays respect maxDelay
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000, expect.anything()); // 1000ms
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 2000, expect.anything()); // 2000ms
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, 2500, expect.anything()); // Capped at 2500ms
      expect(onRetry).toHaveBeenNthCalledWith(4, 4, 2500, expect.anything()); // Still capped at 2500ms
      expect(onRetry).toHaveBeenNthCalledWith(5, 5, 2500, expect.anything()); // Still capped at 2500ms
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle custom shouldRetry function returning false', async () => {
      const client = new FetchClient();
      const shouldRetry = vi.fn().mockReturnValue(false);

      client.use(createRetryMiddleware({ shouldRetry }));

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(
        {
          data: null,
          status: 0,
          statusText: 'Network Error',
          headers: expect.any(Headers),
          url: '/api/test',
          ok: false,
          error: {
            message: 'Network error',
            body: expect.any(Error),
          },
        },
        1,
      );
      expect(result.ok).toBe(false);
    });

    it('should handle shouldRetry function checking attempt number', async () => {
      const client = new FetchClient();
      const shouldRetry = vi.fn((response, attempt) => attempt <= 2); // Only retry first 2 attempts

      client.use(
        createRetryMiddleware({
          maxRetries: 5,
          shouldRetry,
          delay: 10,
        }),
      );

      mockFetch.mockRejectedValue(new Error('Always fails'));

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      await requestPromise;

      // Should only retry twice (attempts 1 and 2), then stop
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(shouldRetry).toHaveBeenCalledTimes(3); // Called for attempts 1, 2, and 3
    });

    it('should handle non-Error objects in catch block', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      client.use(
        createRetryMiddleware({
          maxRetries: 1,
          onRetry,
          delay: 10,
        }),
      );

      // Mock fetch to throw a non-Error object
      mockFetch.mockRejectedValueOnce('String error').mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      const result = await requestPromise;

      // Should succeed on retry after handling non-Error
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ success: true });
      expect(onRetry).toHaveBeenCalledWith(1, 10, {
        status: 0,
        statusText: 'Network Error',
      });
    });

    it('should handle max retries reached', async () => {
      const client = new FetchClient();

      client.use(
        createRetryMiddleware({
          maxRetries: 1,
          delay: 10,
        }),
      );

      // Mock to always return 500 errors
      mockFetch.mockResolvedValue(
        new Response('Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      const result = await requestPromise;

      // Should try twice (initial + 1 retry) then give up
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(false);
    });

    it('should handle max retries reached for network errors', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      client.use(
        createRetryMiddleware({
          maxRetries: 2,
          onRetry,
          delay: 10,
        }),
      );

      // Always throw network error
      mockFetch.mockRejectedValue(new Error('Connection timeout'));

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      const result = await requestPromise;

      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(0);
      expect(result.ok).toBe(false);
      expect(result.error?.message).toBe('Connection timeout');
    });

    it('should return last response when all retries exhausted', async () => {
      const client = new FetchClient();

      client.use(
        createRetryMiddleware({
          maxRetries: 1,
          delay: 10,
        }),
      );

      mockFetch
        .mockResolvedValueOnce(
          new Response('Error 1', {
            status: 500,
            statusText: 'Internal Server Error',
          }),
        )
        .mockResolvedValueOnce(
          new Response('Error 2', {
            status: 502,
            statusText: 'Bad Gateway',
          }),
        );

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      const result = await requestPromise;

      expect(result.status).toBe(502); // Should return the last response
      expect(result.statusText).toBe('Bad Gateway');
    });

    it('should handle successful response after network error', async () => {
      const client = new FetchClient();

      client.use(
        createRetryMiddleware({
          maxRetries: 2,
          delay: 10,
        }),
      );

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
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
      expect(result.data).toEqual({ success: true });
    });

    it('should handle non-Error objects when all retries exhausted', async () => {
      const client = new FetchClient();

      client.use(
        createRetryMiddleware({
          maxRetries: 1,
          delay: 10,
        }),
      );

      // Always throw a non-Error object
      mockFetch.mockRejectedValue('String error');

      const requestPromise = client.get('/api/test');
      await vi.runAllTimersAsync();
      const result = await requestPromise;

      expect(result.error?.message).toBe('Unknown error');
      expect(result.error?.body).toBe('String error');
      expect(result.status).toBe(0);
      expect(result.statusText).toBe('Network Error');
      expect(result.ok).toBe(false);
    });

    it('should call onRetry callback for failed HTTP responses', async () => {
      const client = new FetchClient();
      const onRetry = vi.fn();

      client.use(
        createRetryMiddleware({
          maxRetries: 1,
          onRetry,
          delay: 10,
        }),
      );

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

      expect(onRetry).toHaveBeenCalledWith(1, 10, {
        status: 500,
        statusText: 'Internal Server Error',
      });
      expect(result.ok).toBe(true);
    });

    it('should return last response when loop exhausted without explicit return', async () => {
      const client = new FetchClient();

      client.use(
        createRetryMiddleware({
          maxRetries: 0, // No retries, will exhaust immediately
          delay: 10,
        }),
      );

      mockFetch.mockResolvedValueOnce(
        new Response('Error', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      const result = await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(500);
      expect(result.ok).toBe(false);
    });

    it('should handle custom shouldRetry for network errors', async () => {
      const client = new FetchClient();
      const shouldRetry = vi.fn().mockReturnValue(false);

      client.use(createRetryMiddleware({ shouldRetry }));

      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 0,
          statusText: 'Network Error',
          ok: false,
        }),
        1,
      );
      expect(result.ok).toBe(false);
      expect(result.status).toBe(0);
    });
  });
});

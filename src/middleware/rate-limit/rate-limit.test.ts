/**
 * @fileoverview Rate limit middleware tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../client/fetch-client';
import { useRateLimit, createRateLimitMiddleware } from './index';
import type { RateLimitOptions } from './types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch.mockClear();
  mockFetch.mockResolvedValue(
    new Response('{"success": true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Rate Limit Middleware', () => {
  describe('useRateLimit (Pit of Success API)', () => {
    it('should allow requests within rate limit', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 5,
        windowMs: 1000
      });

      // Make 3 requests quickly
      const promises = [
        rateLimitedClient.get('https://api.example.com/test1'),
        rateLimitedClient.get('https://api.example.com/test2'),
        rateLimitedClient.get('https://api.example.com/test3')
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.ok).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should block requests exceeding rate limit', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 2,
        windowMs: 1000
      });

      // Make 3 requests - third should be rate limited
      await rateLimitedClient.get('https://api.example.com/test1');
      await rateLimitedClient.get('https://api.example.com/test2');
      const rateLimitedResponse = await rateLimitedClient.get('https://api.example.com/test3');

      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.ok).toBe(false);
      expect(rateLimitedResponse.error?.message).toContain('Rate limit exceeded');
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only first two went through
    });

    it('should reset tokens after window period', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 2,
        windowMs: 1000
      });

      // Use up the quota
      await rateLimitedClient.get('https://api.example.com/test1');
      await rateLimitedClient.get('https://api.example.com/test2');

      // This should be blocked
      const blockedResponse = await rateLimitedClient.get('https://api.example.com/test3');
      expect(blockedResponse.status).toBe(429);

      // Advance time past the window
      vi.advanceTimersByTime(1100);

      // This should now work
      const allowedResponse = await rateLimitedClient.get('https://api.example.com/test4');
      expect(allowedResponse.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 2 initial + 1 after reset
    });

    it('should use default rate limit options', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client); // Uses defaults

      // Should allow many requests with generous defaults
      const promises = Array.from({ length: 50 }, (_, i) =>
        rateLimitedClient.get(`https://api.example.com/test${i}`)
      );

      const results = await Promise.all(promises);
      
      // All should succeed with default limits
      results.forEach(result => {
        expect(result.ok).toBe(true);
      });
    });

    it('should respect per-endpoint rate limiting', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 2,
        windowMs: 1000,
        keyGenerator: (request) => {
          const url = new URL(request.url || '');
          return url.pathname; // Different limits per path
        }
      });

      // Each endpoint should have its own bucket
      await rateLimitedClient.get('https://api.example.com/users');
      await rateLimitedClient.get('https://api.example.com/users');
      await rateLimitedClient.get('https://api.example.com/posts');
      await rateLimitedClient.get('https://api.example.com/posts');

      // Both endpoints should be at their limits
      const usersResponse = await rateLimitedClient.get('https://api.example.com/users');
      const postsResponse = await rateLimitedClient.get('https://api.example.com/posts');

      expect(usersResponse.status).toBe(429);
      expect(postsResponse.status).toBe(429);
      expect(mockFetch).toHaveBeenCalledTimes(4); // Only the allowed ones
    });

    it('should skip rate limiting for matching patterns', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 1,
        windowMs: 1000,
        skipPatterns: ['/health', /\/metrics/]
      });

      // Use up the quota with a regular request
      await rateLimitedClient.get('https://api.example.com/users');

      // These should bypass rate limiting
      const healthResponse = await rateLimitedClient.get('https://api.example.com/health');
      const metricsResponse = await rateLimitedClient.get('https://api.example.com/metrics/cpu');
      const regularResponse = await rateLimitedClient.get('https://api.example.com/posts');

      expect(healthResponse.ok).toBe(true);
      expect(metricsResponse.ok).toBe(true);
      expect(regularResponse.status).toBe(429); // This should be blocked

      expect(mockFetch).toHaveBeenCalledTimes(3); // All skipped requests + first regular
    });

    it('should include retry-after header in rate limit response', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 1,
        windowMs: 5000
      });

      await rateLimitedClient.get('https://api.example.com/test');
      const blockedResponse = await rateLimitedClient.get('https://api.example.com/test');

      expect(blockedResponse.status).toBe(429);
      expect(blockedResponse.headers.get('Retry-After')).toBe('5');
    });

    it('should handle token bucket refill correctly', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 2,
        windowMs: 1000
      });

      // Use one token
      await rateLimitedClient.get('https://api.example.com/test1');

      // Wait half the window
      vi.advanceTimersByTime(500);

      // Use second token
      await rateLimitedClient.get('https://api.example.com/test2');

      // This should be blocked (no tokens left)
      const blockedResponse = await rateLimitedClient.get('https://api.example.com/test3');
      expect(blockedResponse.status).toBe(429);

      // Wait for partial refill (first token should be available)
      vi.advanceTimersByTime(600); // Total: 1100ms

      // Should work now (first token refilled)
      const allowedResponse = await rateLimitedClient.get('https://api.example.com/test4');
      expect(allowedResponse.ok).toBe(true);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should use custom error handler', async () => {
      const customHandler = vi.fn().mockReturnValue({
        data: null,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'X-Custom': 'rate-limited' }),
        url: 'https://api.example.com/test',
        ok: false,
        error: { message: 'Custom rate limit error' }
      });

      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 1,
        windowMs: 1000,
        onRateLimitExceeded: customHandler
      });

      await rateLimitedClient.get('https://api.example.com/test');
      const rateLimitedResponse = await rateLimitedClient.get('https://api.example.com/test');

      expect(customHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/test'
        })
      );

      expect(rateLimitedResponse.status).toBe(503);
      expect(rateLimitedResponse.headers.get('X-Custom')).toBe('rate-limited');
    });
  });

  describe('createRateLimitMiddleware (Direct API)', () => {
    it('should create middleware with custom options', async () => {
      const middleware = createRateLimitMiddleware({
        maxRequests: 3,
        windowMs: 2000,
        keyGenerator: () => 'global'
      });

      const client = new FetchClient();
      const rateLimitedClient = client.use(middleware);

      // Should allow 3 requests
      for (let i = 0; i < 3; i++) {
        const response = await rateLimitedClient.get(`https://api.example.com/test${i}`);
        expect(response.ok).toBe(true);
      }

      // Fourth should be blocked
      const blockedResponse = await rateLimitedClient.get('https://api.example.com/test4');
      expect(blockedResponse.status).toBe(429);
    });

    it('should work in middleware chain with other middleware', async () => {
      const authMiddleware = vi.fn().mockImplementation(async (request, next) => {
        request.headers = { ...request.headers, Authorization: 'Bearer token' };
        return next(request);
      });

      const rateLimitMiddleware = createRateLimitMiddleware({
        maxRequests: 2,
        windowMs: 1000
      });

      const client = new FetchClient();
      const chainedClient = client
        .use(authMiddleware)
        .use(rateLimitMiddleware);

      // First request should go through both middleware
      const firstResponse = await chainedClient.get('https://api.example.com/test');
      expect(firstResponse.ok).toBe(true);
      expect(authMiddleware).toHaveBeenCalledTimes(1);

      // Second should also work
      const secondResponse = await chainedClient.get('https://api.example.com/test');
      expect(secondResponse.ok).toBe(true);
      expect(authMiddleware).toHaveBeenCalledTimes(2);

      // Third should be rate limited (auth middleware shouldn't be called)
      const thirdResponse = await chainedClient.get('https://api.example.com/test');
      expect(thirdResponse.status).toBe(429);
      expect(authMiddleware).toHaveBeenCalledTimes(2); // Not called for rate-limited request
    });
  });

  describe('Integration scenarios', () => {
    it('should work with retry middleware', async () => {
      // Mock intermittent server errors
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(new Response('{"success": true}', { status: 200 }));

      const client = new FetchClient();
      
      const { useRetry } = await import('../retry');
      
      const rateLimitedRetryClient = useRateLimit(useRetry(client, {
        maxRetries: 2,
        delayMs: 100
      }), {
        maxRequests: 3,
        windowMs: 1000
      });

      // Should succeed after retry, consuming 2 rate limit tokens
      const response = await rateLimitedRetryClient.get('https://api.example.com/test');
      expect(response.ok).toBe(true);

      // Should still have one more token available
      const secondResponse = await rateLimitedRetryClient.get('https://api.example.com/test2');
      expect(secondResponse.ok).toBe(true);

      // Fourth request should be rate limited
      const rateLimitedResponse = await rateLimitedRetryClient.get('https://api.example.com/test3');
      expect(rateLimitedResponse.status).toBe(429);
    });

    it('should handle concurrent requests correctly', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 3,
        windowMs: 1000
      });

      // Make 5 concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        rateLimitedClient.get(`https://api.example.com/test${i}`)
      );

      const responses = await Promise.all(promises);

      // 3 should succeed, 2 should be rate limited
      const successful = responses.filter(r => r.ok);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful).toHaveLength(3);
      expect(rateLimited).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in other middleware gracefully', async () => {
      const faultyMiddleware = vi.fn().mockRejectedValue(new Error('Middleware error'));

      const client = new FetchClient();
      const rateLimitedClient = client
        .use(faultyMiddleware)
        .use(createRateLimitMiddleware({
          maxRequests: 2,
          windowMs: 1000
        }));

      // Error should propagate, but rate limit should track the attempt
      await expect(rateLimitedClient.get('https://api.example.com/test')).rejects.toThrow('Middleware error');

      // Second request should also error but not be rate limited
      await expect(rateLimitedClient.get('https://api.example.com/test')).rejects.toThrow('Middleware error');

      // Third request should still error (not rate limited yet since errors don't consume tokens)
      await expect(rateLimitedClient.get('https://api.example.com/test')).rejects.toThrow('Middleware error');
    });
  });

  describe('Token bucket algorithm edge cases', () => {
    it('should handle high-frequency requests correctly', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 10,
        windowMs: 1000
      });

      // Make requests in rapid succession
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(rateLimitedClient.get(`https://api.example.com/test${i}`));
      }

      const responses = await Promise.all(promises);

      const successful = responses.filter(r => r.ok);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful).toHaveLength(10);
      expect(rateLimited).toHaveLength(5);
    });

    it('should maintain separate buckets for different keys', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 2,
        windowMs: 1000,
        keyGenerator: (request) => {
          const url = new URL(request.url || '');
          return url.searchParams.get('userId') || 'anonymous';
        }
      });

      // User 1 makes 2 requests
      await rateLimitedClient.get('https://api.example.com/api?userId=1');
      await rateLimitedClient.get('https://api.example.com/api?userId=1');

      // User 2 should still be able to make requests
      const user2Response = await rateLimitedClient.get('https://api.example.com/api?userId=2');
      expect(user2Response.ok).toBe(true);

      // User 1 should be rate limited
      const user1Response = await rateLimitedClient.get('https://api.example.com/api?userId=1');
      expect(user1Response.status).toBe(429);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle time jumps gracefully', async () => {
      const client = new FetchClient();
      const rateLimitedClient = useRateLimit(client, {
        maxRequests: 2,
        windowMs: 1000
      });

      // Use up tokens
      await rateLimitedClient.get('https://api.example.com/test1');
      await rateLimitedClient.get('https://api.example.com/test2');

      // Jump far into the future
      vi.advanceTimersByTime(10000);

      // Should have full capacity restored
      const response1 = await rateLimitedClient.get('https://api.example.com/test3');
      const response2 = await rateLimitedClient.get('https://api.example.com/test4');

      expect(response1.ok).toBe(true);
      expect(response2.ok).toBe(true);
    });
  });
});

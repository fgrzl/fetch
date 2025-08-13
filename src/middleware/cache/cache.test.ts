/**
 * @fileoverview Cache middleware tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../../client/fetch-client';
import { useCache, createCacheMiddleware } from './index';
import type { CacheStorage } from './types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue(
    new Response('{"data": "test"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
});

describe('Cache Middleware', () => {
  describe('useCache (Pit of Success API)', () => {
    it('should cache GET requests', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client);

      // First call
      const response1 = await cachedClient.get('https://api.example.com/users');
      expect(response1.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const response2 = await cachedClient.get('https://api.example.com/users');
      expect(response2.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should not cache POST requests by default', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client);

      // First POST
      await cachedClient.post('https://api.example.com/users', {
        name: 'John',
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second POST - should not use cache
      await cachedClient.post('https://api.example.com/users', {
        name: 'Jane',
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect custom TTL', async () => {
      vi.useFakeTimers();

      const client = new FetchClient();
      const cachedClient = useCache(client, {
        ttl: 1000, // 1 second
      });

      // First call
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 500ms - should still use cache
      vi.advanceTimersByTime(500);
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by another 600ms (1100ms total) - cache expired
      vi.advanceTimersByTime(600);
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should cache custom methods when configured', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client, {
        methods: ['GET', 'POST'],
      });

      // First POST
      await cachedClient.post('https://api.example.com/search', {
        query: 'test',
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second identical POST - should use cache
      await cachedClient.post('https://api.example.com/search', {
        query: 'test',
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should skip caching for URLs matching skip patterns', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client, {
        skipPatterns: ['/dynamic', /\/user\//],
      });

      // First call to dynamic endpoint
      await cachedClient.get('https://api.example.com/dynamic');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should not use cache due to skip pattern
      await cachedClient.get('https://api.example.com/dynamic');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Call to user endpoint - should also skip cache
      await cachedClient.get('https://api.example.com/user/123');
      await cachedClient.get('https://api.example.com/user/123');
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Call to regular endpoint - should use cache
      await cachedClient.get('https://api.example.com/static');
      await cachedClient.get('https://api.example.com/static');
      expect(mockFetch).toHaveBeenCalledTimes(5); // Only one more call
    });

    it('should use custom cache key generator', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client, {
        keyGenerator: (request) => request.url || 'default',
      });

      // Same URL, different headers - should use same cache key
      await cachedClient.get('https://api.example.com/users');
      await cachedClient.request('https://api.example.com/users', {
        method: 'GET',
        headers: { 'X-Custom': 'header' },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one call due to same URL
    });

    it('should handle stale-while-revalidate', async () => {
      vi.useFakeTimers();

      const client = new FetchClient();
      const cachedClient = useCache(client, {
        ttl: 1000,
        staleWhileRevalidate: true,
      });

      // First call
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Expire the cache
      vi.advanceTimersByTime(1500);

      // Mock different response for revalidation
      mockFetch.mockResolvedValueOnce(
        new Response('{"data": "updated"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // Second call - should return stale data immediately and update in background
      const response = await cachedClient.get('https://api.example.com/users');
      expect(response.data).toEqual({ data: 'test' }); // Stale data
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Wait for background update
      await vi.runAllTimersAsync();

      vi.useRealTimers();
    });
  });

  describe('Custom cache storage', () => {
    it('should work with custom storage implementation', async () => {
      const mockStorage: CacheStorage = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      };

      const client = new FetchClient();
      const cachedClient = useCache(client, {
        storage: mockStorage,
      });

      await cachedClient.get('https://api.example.com/users');

      expect(mockStorage.get).toHaveBeenCalled();
      expect(mockStorage.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          response: expect.objectContaining({
            status: 200,
            data: { data: 'test' },
          }),
          timestamp: expect.any(Number),
          expiresAt: expect.any(Number),
        }),
      );
    });

    it('should handle storage errors gracefully', async () => {
      const faultyStorage: CacheStorage = {
        get: vi.fn().mockRejectedValue(new Error('Storage error')),
        set: vi.fn().mockRejectedValue(new Error('Storage error')),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      };

      const client = new FetchClient();
      const cachedClient = useCache(client, {
        storage: faultyStorage,
      });

      // Should not throw, should fallback to network
      const response = await cachedClient.get('https://api.example.com/users');
      expect(response.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('createCacheMiddleware (Direct API)', () => {
    it('should create middleware with custom options', async () => {
      const middleware = createCacheMiddleware({
        ttl: 2000,
        methods: ['GET', 'HEAD'],
      });

      const client = new FetchClient();
      const cachedClient = client.use(middleware);

      await cachedClient.get('https://api.example.com/test');
      await cachedClient.get('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should work in middleware chain', async () => {
      const cache1 = createCacheMiddleware({
        keyGenerator: (req) => `cache1:${req.url}`,
      });

      const cache2 = createCacheMiddleware({
        keyGenerator: (req) => `cache2:${req.url}`,
      });

      const client = new FetchClient();
      const multiCacheClient = client.use(cache1).use(cache2);

      // Both caches should work independently
      await multiCacheClient.get('https://api.example.com/test');
      await multiCacheClient.get('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache key generation', () => {
    it('should generate different keys for different requests', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client);

      // Different URLs
      await cachedClient.get('https://api.example.com/users');
      await cachedClient.get('https://api.example.com/posts');

      // Different methods
      await cachedClient.get('https://api.example.com/data');
      await cachedClient.request('https://api.example.com/data', {
        method: 'HEAD',
      });

      expect(mockFetch).toHaveBeenCalledTimes(4); // All different requests
    });

    it('should generate same key for identical requests', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client, {
        methods: ['GET', 'POST'],
      });

      // Same POST requests
      await cachedClient.post('https://api.example.com/search', {
        query: 'test',
      });
      await cachedClient.post('https://api.example.com/search', {
        query: 'test',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1); // Should use cache
    });
  });

  describe('Error handling', () => {
    it('should not cache error responses', async () => {
      mockFetch.mockResolvedValue(new Response('Not Found', { status: 404 }));

      const client = new FetchClient();
      const cachedClient = useCache(client);

      // First 404 call
      const response1 = await cachedClient.get(
        'https://api.example.com/missing',
      );
      expect(response1.status).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should not use cache for error responses
      const response2 = await cachedClient.get(
        'https://api.example.com/missing',
      );
      expect(response2.status).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new FetchClient();
      const cachedClient = useCache(client);

      await expect(
        cachedClient.get('https://api.example.com/users'),
      ).rejects.toThrow('Network error');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with other middleware', () => {
    it('should work with authentication middleware', async () => {
      const client = new FetchClient();

      const { useAuthentication } = await import('../authentication');

      const authCachedClient = useAuthentication(client, {
        tokenProvider: () => 'test-token',
      }).use(createCacheMiddleware());

      // First call
      await authCachedClient.get('https://api.example.com/secure');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await authCachedClient.get('https://api.example.com/secure');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify auth header was added
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/secure',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });
  });
});

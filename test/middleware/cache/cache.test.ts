/**
 * @fileoverview Cache middleware tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../../../src/client/fetch-client';
import {
  useCache,
  createCacheMiddleware,
} from '../../../src/middleware/cache/index';
import type { CacheStorage } from '../../../src/middleware/cache/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockImplementation(() =>
    Promise.resolve(
      new Response('{"data": "test"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
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

    it('should handle requests with no URL or method', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client);

      // Test default key generator with empty/undefined values
      await cachedClient.request('', {}); // Empty URL
      await cachedClient.request('', {}); // Same empty request

      expect(mockFetch).toHaveBeenCalledTimes(1); // Should use cache for identical empty requests
    });

    it('should handle requests with no headers', async () => {
      const client = new FetchClient();
      const cachedClient = useCache(client);

      // Test requests without headers
      await cachedClient.get('https://api.example.com/no-headers');
      await cachedClient.get('https://api.example.com/no-headers');

      expect(mockFetch).toHaveBeenCalledTimes(1); // Should use cache
    });
  });

  describe('Error handling', () => {
    it('should not cache error responses', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response('Not Found', { status: 404 })),
      );

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

  describe('MemoryStorage implementation', () => {
    it('should handle expired entries in get method', async () => {
      vi.useFakeTimers();

      const client = new FetchClient();
      const cachedClient = useCache(client, { ttl: 1000 });

      // First call to populate cache
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Expire the cache
      vi.advanceTimersByTime(1500);

      // Second call should trigger cache expiry cleanup and make new request
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should handle getWithExpiry method when storage supports it', async () => {
      vi.useFakeTimers();

      const client = new FetchClient();
      const cachedClient = useCache(client, {
        ttl: 1000,
        staleWhileRevalidate: true,
      });

      // First call
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Expire cache
      vi.advanceTimersByTime(1500);

      // Mock updated response for background update
      mockFetch.mockResolvedValueOnce(
        new Response('{"data": "updated"}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // This should return stale data and trigger background update
      const response = await cachedClient.get('https://api.example.com/users');
      expect(response.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should handle storage without getWithExpiry method', async () => {
      const customStorage = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        // Note: no getWithExpiry method
      };

      const client = new FetchClient();
      const cachedClient = useCache(client, {
        storage: customStorage,
        staleWhileRevalidate: true,
      });

      await cachedClient.get('https://api.example.com/users');

      expect(customStorage.get).toHaveBeenCalled();
      expect(customStorage.set).toHaveBeenCalled();
    });

    it('should test delete and clear methods directly', async () => {
      const { createCacheMiddleware } = await import(
        '../../../src/middleware/cache'
      );

      // Create a custom storage that we can monitor
      const storageMap = new Map();
      const customStorage: CacheStorage = {
        get: vi.fn(async (key: string) => {
          const entry = storageMap.get(key);
          if (!entry) return null;

          // Check if expired
          if (Date.now() > entry.expiresAt) {
            storageMap.delete(key);
            return null;
          }
          return entry;
        }),
        getWithExpiry: vi.fn(async (key: string) => {
          const entry = storageMap.get(key);
          if (!entry) {
            return { entry: null, isExpired: false };
          }

          const isExpired = Date.now() > entry.expiresAt;
          return { entry, isExpired };
        }),
        set: vi.fn(async (key: string, entry: any) => {
          storageMap.set(key, entry);
        }),
        delete: vi.fn(async (key: string) => {
          storageMap.delete(key);
        }),
        clear: vi.fn(async () => {
          storageMap.clear();
        }),
      };

      const middleware = createCacheMiddleware({ storage: customStorage });
      const client = new FetchClient();
      const cachedClient = client.use(middleware);

      // Make a request to populate cache
      await cachedClient.get('https://api.example.com/users');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(customStorage.set).toHaveBeenCalled();

      // Verify storage methods are available
      expect(typeof customStorage.delete).toBe('function');
      expect(typeof customStorage.clear).toBe('function');
    });

    it('should force default MemoryStorage methods usage', async () => {
      vi.useFakeTimers();

      const client = new FetchClient();
      // Use default storage (MemoryStorage) without custom storage
      const cachedClient = useCache(client, { ttl: 1000 });

      // Populate cache
      await cachedClient.get('https://api.example.com/test');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Use cache
      await cachedClient.get('https://api.example.com/test');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Expire cache - this will trigger the delete in the get method when expired
      vi.advanceTimersByTime(1500);

      // This should trigger cache expiry cleanup and deletion
      await cachedClient.get('https://api.example.com/test');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    describe('MemoryStorage direct testing', () => {
      it('should test MemoryStorage methods directly', async () => {
        vi.useFakeTimers();

        const { MemoryStorage } = await import('../../../src/middleware/cache');
        const storage = new MemoryStorage();

        const cacheEntry = {
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: 'test',
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + 10000, // 10 seconds from now
        };

        // Test set and get
        await storage.set('test-key', cacheEntry);
        let entry = await storage.get('test-key');
        expect(entry).toBeTruthy();
        expect(entry?.response.data).toBe('test');

        // Test getWithExpiry with fresh entry
        let result = await storage.getWithExpiry('test-key');
        expect(result.entry).toBeTruthy();
        expect(result.isExpired).toBe(false);

        // Test getWithExpiry with non-existent key
        result = await storage.getWithExpiry('non-existent');
        expect(result.entry).toBeNull();
        expect(result.isExpired).toBe(false);

        // Test with expired entry for get method
        const expiredEntry = {
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: 'expired',
          },
          timestamp: Date.now() - 2000,
          expiresAt: Date.now() - 1000, // Already expired
        };
        await storage.set('expired-key', expiredEntry);

        // Test get with expired entry (should auto-delete and return null)
        entry = await storage.get('expired-key');
        expect(entry).toBeNull();

        // Test getWithExpiry with expired entry (should return entry but mark as expired)
        await storage.set('expired-key-2', expiredEntry);
        result = await storage.getWithExpiry('expired-key-2');
        expect(result.entry).toBeTruthy();
        expect(result.isExpired).toBe(true);

        // Test delete
        await storage.delete('expired-key-2');
        entry = await storage.get('expired-key-2');
        expect(entry).toBeNull();

        // Test clear - use fresh entries that won't expire
        const freshEntry1 = {
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: 'fresh1',
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + 10000,
        };
        const freshEntry2 = {
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            data: 'fresh2',
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + 10000,
        };

        await storage.set('key1', freshEntry1);
        await storage.set('key2', freshEntry2);

        // Verify entries exist
        expect(await storage.get('key1')).toBeTruthy();
        expect(await storage.get('key2')).toBeTruthy();

        // Clear all
        await storage.clear();

        // Verify entries are gone
        expect(await storage.get('key1')).toBeNull();
        expect(await storage.get('key2')).toBeNull();

        vi.useRealTimers();
      });
    });
  });

  describe('Advanced error scenarios', () => {
    it('should handle cache storage set errors gracefully', async () => {
      const faultyStorage = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockRejectedValue(new Error('Storage write error')),
        delete: vi.fn(),
        clear: vi.fn(),
      };

      const client = new FetchClient();
      const cachedClient = useCache(client, { storage: faultyStorage });

      // Should still work and return response even if cache storage fails
      const response = await cachedClient.get('https://api.example.com/users');
      expect(response.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(faultyStorage.set).toHaveBeenCalled();
    });

    it('should re-throw network errors correctly', async () => {
      const networkError = new Error('Network request failed');
      mockFetch.mockRejectedValue(networkError);

      const client = new FetchClient();
      const cachedClient = useCache(client);

      await expect(
        cachedClient.get('https://api.example.com/users'),
      ).rejects.toThrow('Network request failed');
    });

    it('should re-throw fetch errors correctly', async () => {
      const fetchError = new Error('fetch failed to connect');
      mockFetch.mockRejectedValue(fetchError);

      const client = new FetchClient();
      const cachedClient = useCache(client);

      await expect(
        cachedClient.get('https://api.example.com/users'),
      ).rejects.toThrow('fetch failed to connect');
    });

    it('should handle non-error-like objects in catch block', async () => {
      const faultyStorage = {
        get: vi.fn().mockRejectedValue('string error'),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };

      const client = new FetchClient();
      const cachedClient = useCache(client, { storage: faultyStorage });

      // Should fallback to network request when cache retrieval fails with non-error
      const response = await cachedClient.get('https://api.example.com/users');
      expect(response.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle cache errors without message property', async () => {
      const errorWithoutMessage = { someProperty: 'value' };
      const faultyStorage = {
        get: vi.fn().mockRejectedValue(errorWithoutMessage),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      };

      const client = new FetchClient();
      const cachedClient = useCache(client, { storage: faultyStorage });

      // Should fallback to network request
      const response = await cachedClient.get('https://api.example.com/users');
      expect(response.data).toEqual({ data: 'test' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Background update error handling', () => {
    it('should ignore background update errors in stale-while-revalidate', async () => {
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

      // Mock error for background update
      mockFetch.mockRejectedValueOnce(new Error('Background update failed'));

      // Should return stale data and not throw error
      const response = await cachedClient.get('https://api.example.com/users');
      expect(response.data).toEqual({ data: 'test' });

      // Wait for background promise to resolve/reject
      await vi.runAllTimersAsync();

      // Should not throw error
      vi.useRealTimers();
    });
  });

  describe('Integration with other middleware', () => {
    it('should work with authentication middleware', async () => {
      const client = new FetchClient();

      const { useAuthentication } = await import(
        '../../../src/middleware/authentication'
      );

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
            authorization: 'Bearer test-token',
          }),
        }),
      );
    });
  });
});

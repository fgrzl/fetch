/**
 * @fileoverview Cache middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type {
  CacheOptions,
  CacheStorage,
  CacheEntry,
  CacheKeyGenerator,
} from './types';

/**
 * Default in-memory cache storage implementation.
 */
class MemoryStorage implements CacheStorage {
  private cache = new Map<string, CacheEntry>();

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Default cache key generator.
 */
const defaultKeyGenerator: CacheKeyGenerator = (request) => {
  const url = request.url || '';
  const method = request.method || 'GET';
  const headers = request.headers ? JSON.stringify(request.headers) : '';
  return `${method}:${url}:${headers}`;
};

/**
 * Checks if a URL should skip caching based on configured patterns.
 */
function shouldSkipCache(
  url: string,
  skipPatterns: (RegExp | string)[] = [],
): boolean {
  return skipPatterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}

/**
 * Creates cache middleware with smart defaults.
 * Caches GET responses for faster subsequent requests.
 *
 * @param options - Cache configuration options
 * @returns Cache middleware for use with FetchClient
 *
 * @example Basic caching:
 * ```typescript
 * const cachedClient = useCache(client);
 * // GET requests will be cached for 5 minutes
 * ```
 *
 * @example Custom TTL:
 * ```typescript
 * const cachedClient = useCache(client, {
 *   ttl: 10 * 60 * 1000 // 10 minutes
 * });
 * ```
 */
export function createCacheMiddleware(
  options: CacheOptions = {},
): FetchMiddleware {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    methods = ['GET'],
    storage = new MemoryStorage(),
    keyGenerator = defaultKeyGenerator,
    skipPatterns = [],
    staleWhileRevalidate = false,
  } = options;

  return async (request, next) => {
    const method = (request.method || 'GET').toUpperCase();
    const url = request.url || '';

    // Skip caching if:
    // 1. Method is not in cached methods list
    // 2. URL matches a skip pattern
    if (!methods.includes(method) || shouldSkipCache(url, skipPatterns)) {
      return next(request);
    }

    const cacheKey = keyGenerator(request);

    try {
      // Try to get cached response
      const cached = await storage.get(cacheKey);

      if (cached && !staleWhileRevalidate) {
        // Return cached response
        return {
          ...cached.response,
          headers: new Headers(cached.response.headers),
          data: cached.response.data,
        } as any;
      }

      // If stale-while-revalidate and we have cached data, return it immediately
      // and update in background
      if (cached && staleWhileRevalidate) {
        // Return stale data immediately
        const staleResponse = {
          ...cached.response,
          headers: new Headers(cached.response.headers),
          data: cached.response.data,
        } as any;

        // Update cache in background
        next(request)
          .then(async (freshResponse) => {
            const headersObj: Record<string, string> = {};
            freshResponse.headers.forEach((value, key) => {
              headersObj[key] = value;
            });

            const cacheEntry: CacheEntry = {
              response: {
                status: freshResponse.status,
                statusText: freshResponse.statusText,
                headers: headersObj,
                data: freshResponse.data,
              },
              timestamp: Date.now(),
              expiresAt: Date.now() + ttl,
            };
            await storage.set(cacheKey, cacheEntry);
          })
          .catch(() => {
            // Ignore background update errors
          });

        return staleResponse;
      }

      // No cached data or not using stale-while-revalidate
      const response = await next(request);

      // Cache successful responses
      if (response.ok) {
        const headersObj: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headersObj[key] = value;
        });

        const cacheEntry: CacheEntry = {
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: headersObj,
            data: response.data,
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        };

        await storage.set(cacheKey, cacheEntry);
      }

      return response;
    } catch {
      // If caching fails, just proceed with the request
      return next(request);
    }
  };
}

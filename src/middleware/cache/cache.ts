/**
 * @fileoverview Cache middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { FetchResponse } from '../../client/types';
import type {
  CacheOptions,
  CacheStorage,
  CacheEntry,
  CacheKeyGenerator,
} from './types';

/**
 * Default in-memory cache storage implementation.
 */
export class MemoryStorage implements CacheStorage {
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

  async getWithExpiry(
    key: string,
  ): Promise<{ entry: CacheEntry | null; isExpired: boolean }> {
    const entry = this.cache.get(key);
    if (!entry) {
      return { entry: null, isExpired: false };
    }

    const isExpired = Date.now() > entry.expiresAt;
    // Don't delete expired entries when using getWithExpiry - let the caller decide
    return { entry, isExpired };
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
      // Try to get cached response with expiry info
      const { entry: cached, isExpired } = storage.getWithExpiry
        ? await storage.getWithExpiry(cacheKey)
        : await (async () => {
            const entry = await storage.get(cacheKey);
            return { entry, isExpired: false };
          })();

      if (cached && !isExpired) {
        // Return fresh cached response
        return {
          ...cached.response,
          headers: new Headers(cached.response.headers),
          data: cached.response.data,
        } as FetchResponse<unknown>;
      }

      // If stale-while-revalidate and we have cached data (even expired), return it immediately
      // and update in background
      if (cached && staleWhileRevalidate) {
        // Return cached data immediately (even if stale)
        const cachedResponse = {
          ...cached.response,
          headers: new Headers(cached.response.headers),
          data: cached.response.data,
        } as FetchResponse<unknown>;

        // Update cache in background if expired
        if (isExpired) {
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
        }

        return cachedResponse;
      }

      // No cached data or not using stale-while-revalidate
      const response = await next(request);

      // Cache successful responses
      if (response.ok) {
        try {
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
        } catch {
          // Ignore cache storage errors, but still return the response
        }
      }

      return response;
    } catch (error) {
      // Only catch cache retrieval errors, let network errors through
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message;
        if (
          errorMessage.includes('Network') ||
          errorMessage.includes('fetch')
        ) {
          throw error; // Re-throw network errors
        }
      }

      // If cache retrieval fails, just proceed with the request
      return next(request);
    }
  };
}

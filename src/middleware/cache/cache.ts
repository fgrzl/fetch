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
 * Serialize headers for cache key so different auth/headers get different keys.
 * Headers objects stringify to "{}", so we must iterate to include Authorization etc.
 */
function headersToCacheKeyPart(
  headers: Headers | Record<string, string> | string[][] | undefined,
): string {
  if (!headers) {
    return '';
  }
  if (headers instanceof Headers) {
    const entries: string[] = [];
    headers.forEach((value, key) => {
      entries.push(`${key}:${value}`);
    });
    return entries.sort().join('|');
  }
  if (Array.isArray(headers)) {
    const entries = headers.map(([k, v]) => `${k}:${v}`).sort();
    return entries.join('|');
  }
  return JSON.stringify(headers);
}

/**
 * Default cache key generator.
 */
const defaultKeyGenerator: CacheKeyGenerator = (request) => {
  const url = request.url || '';
  const method = request.method || 'GET';
  const headers = headersToCacheKeyPart(request.headers);
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

function cloneCacheData<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function reuseCacheData<T>(value: T): T {
  return value;
}

/**
 * Creates TTL response memoization middleware.
 * Caches GET responses for faster subsequent requests.
 *
 * @param options - Cache configuration options
 * @returns Cache middleware for use with FetchClient
 *
 * @example Basic caching:
 * ```typescript
 * const cachedClient = addCache(client);
 * // GET requests will be cached for 5 minutes
 * ```
 *
 * @example Custom TTL:
 * ```typescript
 * const cachedClient = addCache(client, {
 *   ttl: 10 * 60 * 1000 // 10 minutes
 * });
 * ```
 */
export function createCacheMiddleware(
  options: CacheOptions = {},
): FetchMiddleware {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    storage = new MemoryStorage(),
    keyGenerator = defaultKeyGenerator,
    skipPatterns = [],
    staleWhileRevalidate = false,
    cloneData = true,
  } = options;
  const copyCacheData = cloneData ? cloneCacheData : reuseCacheData;

  return async (request, next) => {
    const method = (request.method || 'GET').toUpperCase();
    const url = request.url || '';

    if (method !== 'GET' || shouldSkipCache(url, skipPatterns)) {
      return next(request);
    }

    const cacheKey = keyGenerator(request);
    let cached: CacheEntry | null;
    let isExpired: boolean;

    try {
      const cachedResult = storage.getWithExpiry
        ? await storage.getWithExpiry(cacheKey)
        : await (async () => {
            const entry = await storage.get(cacheKey);
            return { entry, isExpired: false };
          })();
      cached = cachedResult.entry;
      isExpired = cachedResult.isExpired;
    } catch {
      return next(request);
    }

    if (cached && !isExpired) {
      return {
        ...cached.response,
        headers: new Headers(cached.response.headers),
        data: copyCacheData(cached.response.data),
        ok: true,
        error: null,
      } as FetchResponse<unknown>;
    }

    if (cached && staleWhileRevalidate) {
      const cachedResponse = {
        ...cached.response,
        headers: new Headers(cached.response.headers),
        data: copyCacheData(cached.response.data),
        ok: true,
        error: null,
      } as FetchResponse<unknown>;

      if (isExpired) {
        next(request)
          .then(async (freshResponse) => {
            if (!freshResponse.ok) {
              return;
            }

            const headersObj: Record<string, string> = {};
            freshResponse.headers.forEach((value, key) => {
              headersObj[key] = value;
            });

            await storage.set(cacheKey, {
              response: {
                status: freshResponse.status,
                statusText: freshResponse.statusText,
                headers: headersObj,
                url: freshResponse.url,
                data: copyCacheData(freshResponse.data),
              },
              timestamp: Date.now(),
              expiresAt: Date.now() + ttl,
            });
          })
          .catch(() => {
            // A background refresh must not reject the active request.
          });
      }

      return cachedResponse;
    }

    const response = await next(request);
    if (response.ok) {
      try {
        const headersObj: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headersObj[key] = value;
        });

        await storage.set(cacheKey, {
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: headersObj,
            url: response.url,
            data: copyCacheData(response.data),
          },
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        });
      } catch {
        // Storage failure does not change a successful request response.
      }
    }

    return response;
  };
}

/**
 * @fileoverview Cache middleware - "pit of success" API.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { CacheOptions } from './types';
import { createCacheMiddleware } from './cache';

// Re-export types for convenience
export type {
  CacheOptions,
  CacheStorage,
  CacheEntry,
  CacheKeyGenerator,
} from './types';
export { createCacheMiddleware, MemoryStorage } from './cache';

/**
 * "Pit of success" API for adding response caching to a FetchClient.
 * Caches GET responses for faster subsequent requests.
 *
 * @param client - The FetchClient to add caching to
 * @param options - Cache configuration options
 * @returns A new FetchClient with cache middleware
 *
 * @example Basic caching (5 minute TTL):
 * ```typescript
 * const cachedClient = addCache(client);
 *
 * // First call hits the network
 * await cachedClient.get('/api/data');
 *
 * // Second call returns cached data
 * await cachedClient.get('/api/data');
 * ```
 *
 * @example Custom TTL and methods:
 * ```typescript
 * const cachedClient = addCache(client, {
 *   ttl: 10 * 60 * 1000, // 10 minutes
 *   methods: ['GET', 'HEAD']
 * });
 * ```
 *
 * @example Stale-while-revalidate:
 * ```typescript
 * const cachedClient = addCache(client, {
 *   staleWhileRevalidate: true
 * });
 * // Returns stale data immediately, updates cache in background
 * ```
 */
export function addCache(
  client: FetchClient,
  options: CacheOptions = {},
): FetchClient {
  return client.use(createCacheMiddleware(options));
}

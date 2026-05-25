/**
 * @fileoverview Cache middleware types and configuration.
 */

/**
 * Cache key generator function.
 * Should return a unique key for the request.
 */
export type CacheKeyGenerator = (
  request: RequestInit & { url?: string },
) => string;

/**
 * Cache storage interface.
 * Allows custom cache implementations.
 */
export interface CacheStorage {
  get(key: string): Promise<CacheEntry | null>;
  getWithExpiry?(
    key: string,
  ): Promise<{ entry: CacheEntry | null; isExpired: boolean }>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Cached response entry.
 */
export interface CacheEntry {
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    url: string;
    data: unknown;
  };
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache memoization configuration options.
 *
 * Defaults:
 * - Only caches GET requests
 * - 5 minute default TTL
 * - Memory-based storage
 * - Automatic cache key generation
 */
export interface CacheOptions {
  /**
   * Time to live in milliseconds (default: 300000 = 5 minutes)
   * How long responses should be cached
   */
  ttl?: number;

  /**
   * Cache storage implementation (default: in-memory)
   * Can be replaced with localStorage, IndexedDB, etc.
   */
  storage?: CacheStorage;

  /**
   * Custom cache key generator (default: URL + method + headers)
   * Should return a unique key for each request
   *
   * @example Custom key generator:
   * ```typescript
   * keyGenerator: (request) => `${request.method}:${request.url}`
   * ```
   */
  keyGenerator?: CacheKeyGenerator;

  /**
   * Skip caching for requests matching these URL patterns
   *
   * @example
   * ```typescript
   * skipPatterns: [/\/api\/user/, '/dynamic-data']
   * ```
   */
  skipPatterns?: (RegExp | string)[];

  /**
   * Whether to serve stale cache entries while revalidating
   * When true, returns cached data immediately and updates cache in background
   */
  staleWhileRevalidate?: boolean;

  /**
   * Whether to clone data when storing and returning cached responses.
   * Defaults to true so callers cannot mutate future cache reads.
   * Disable only when cached response data is treated as immutable.
   */
  cloneData?: boolean;
}

// Ensure this file is treated as a module

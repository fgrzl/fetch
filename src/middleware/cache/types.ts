/**
 * @fileoverview Cache middleware types and configuration.
 */

/**
 * Cache key generator function.
 * Should return a unique key for the request.
 */
export type CacheKeyGenerator = (request: RequestInit & { url?: string }) => string;

/**
 * Cache storage interface.
 * Allows custom cache implementations.
 */
export interface CacheStorage {
  get(key: string): Promise<CacheEntry | null>;
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
    data: any;
  };
  timestamp: number;
  expiresAt: number;
}

/**
 * Cache configuration options - optimized for "pit of success".
 * 
 * Smart defaults:
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
   * HTTP methods to cache (default: ['GET'])
   * Only these methods will be cached
   */
  methods?: string[];

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
}

// Ensure this file is treated as a module
export {};

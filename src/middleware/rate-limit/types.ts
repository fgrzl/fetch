/**
 * @fileoverview Rate limiting middleware types and configuration.
 */

import type { FetchResponse } from '../../client/types';

/**
 * Configuration for the token-bucket rate limiter.
 *
 * Defaults:
 * - 60 requests per minute
 * - Token bucket algorithm
 * - Per-client limiting
 * - Graceful handling when rate limit exceeded
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed (default: 60)
   */
  maxRequests?: number;

  /**
   * Time window in milliseconds (default: 60000 = 1 minute)
   */
  windowMs?: number;

  /**
   * Custom key generator for rate limiting scope
   * Default: single global rate limit for all requests
   *
   * @example Per-endpoint rate limiting:
   * ```typescript
   * keyGenerator: (request) => request.url || 'default'
   * ```
   *
   * @example Per-user rate limiting:
   * ```typescript
   * keyGenerator: (request) => {
   *   const auth = request.headers?.get('Authorization');
   *   return auth ? `user:${auth}` : 'anonymous';
   * }
   * ```
   */
  keyGenerator?: (request: RequestInit & { url?: string }) => string;

  /**
   * Skip rate limiting for requests matching these URL patterns
   *
   * @example
   * ```typescript
   * skipPatterns: ['/health', /^\/public\//]
   * ```
   */
  skipPatterns?: (RegExp | string)[];

  /**
   * Custom handler called when rate limit is exceeded
   * Can return a custom response or void to use default behavior
   *
   * @param retryAfter - Milliseconds until next request is allowed
   * @param request - The rate-limited request
   * @returns Custom response or void for default behavior
   */
  onRateLimitExceeded?: (
    retryAfter: number,
    request: RequestInit & { url?: string },
  ) =>
    | void
    | Promise<void>
    | FetchResponse<unknown>
    | Promise<FetchResponse<unknown>>;
}

// Ensure this file is treated as a module

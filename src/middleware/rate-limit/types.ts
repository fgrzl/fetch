/**
 * @fileoverview Rate limiting middleware types and configuration.
 */

/**
 * Rate limiting algorithm types.
 */
export type RateLimitAlgorithm =
  | 'token-bucket'
  | 'sliding-window'
  | 'fixed-window';

/**
 * Rate limiting configuration options - optimized for "pit of success".
 *
 * Smart defaults:
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
   * Rate limiting algorithm (default: 'token-bucket')
   * - 'token-bucket': Allows bursts up to maxRequests, refills over time
   * - 'sliding-window': Smooth rate limiting over rolling window
   * - 'fixed-window': Fixed number of requests per fixed time window
   */
  algorithm?: RateLimitAlgorithm;

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
    | {
        data: unknown;
        status: number;
        statusText: string;
        headers: Headers;
        url: string;
        ok: boolean;
        error?: { message: string; body?: unknown };
      }
    | Promise<{
        data: unknown;
        status: number;
        statusText: string;
        headers: Headers;
        url: string;
        ok: boolean;
        error?: { message: string; body?: unknown };
      }>;
}

// Ensure this file is treated as a module
export {};

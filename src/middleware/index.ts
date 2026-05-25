/**
 * @fileoverview Optional middleware collection for FetchClient.
 *
 * This module provides middleware for common HTTP client concerns:
 * - Authentication: Bearer token injection
 * - Authorization: 401/403 response handling
 * - Cache: Response caching with TTL
 * - CSRF: Cross-site request forgery protection
 * - Logging: Request/response logging
 * - Rate limiting: Request rate limiting with token bucket
 * - Retry: Automatic retry with backoff
 *
 * Middleware is opt-in. Use `add{Middleware}()` convenience functions or
 * `create{Middleware}Middleware()` factories when adding a middleware directly.
 * - Comprehensive TypeScript support
 *
 * @example Quick setup with multiple middleware:
 * ```typescript
 * import { FetchClient } from '@fgrzl/fetch';
 * import { addAuthentication, addRetry, addLogging } from '@fgrzl/fetch/middleware';
 *
 * const client = new FetchClient();
 * addAuthentication(client, {
 *   tokenProvider: () => localStorage.getItem('auth-token') || ''
 * });
 * addRetry(client, { maxRetries: 3 });
 * addLogging(client);
 * ```
 */

// Authentication middleware
export type {
  AuthenticationOptions,
  AuthTokenProvider,
} from './authentication';

export {
  addAuthentication,
  createAuthenticationMiddleware,
} from './authentication';

// Authorization middleware
export type {
  AuthorizationOptions,
  UnauthorizedHandler,
} from './authorization';

export {
  addAuthorization,
  createAuthorizationMiddleware,
} from './authorization';

// Cache middleware
export type {
  CacheOptions,
  CacheStorage,
  CacheEntry,
  CacheKeyGenerator,
} from './cache';

export { addCache, createCacheMiddleware } from './cache';

// CSRF middleware
export { addCSRF } from './csrf';

// Logging middleware
export type { LoggingOptions, Logger, LogLevel } from './logging';

export { addLogging, createLoggingMiddleware } from './logging';

// Rate limiting middleware
export type { RateLimitOptions } from './rate-limit';

export { addRateLimit, createRateLimitMiddleware } from './rate-limit';

// Retry middleware
export type { RetryOptions } from './retry';

export { addRetry, createRetryMiddleware } from './retry';

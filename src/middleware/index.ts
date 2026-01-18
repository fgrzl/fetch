/**
 * @fileoverview Complete middleware collection for FetchClient - "pit of success" APIs.
 *
 * This module provides a comprehensive set of middleware for common HTTP client concerns:
 * - 🔐 Authentication: Bearer token injection
 * - 🛡️ Authorization: 401/403 response handling
 * - 💾 Cache: Response caching with TTL
 * - 🔒 CSRF: Cross-site request forgery protection
 * - 📝 Logging: Request/response logging
 * - 🚦 Rate Limiting: Request rate limiting with token bucket
 * - 🔄 Retry: Automatic retry with backoff
 *
 * Each middleware follows the "pit of success" pattern with:
 * - Smart defaults for common scenarios
 * - Simple `add{Middleware}()` convenience functions
 * - Advanced `create{Middleware}Middleware()` for custom scenarios
 * - Comprehensive TypeScript support
 *
 * @example Quick setup with multiple middleware:
 * ```typescript
 * import { FetchClient } from '@fgrzl/fetch';
 * import { addAuthentication, addRetry, addLogging } from '@fgrzl/fetch/middleware';
 *
 * const client = new FetchClient();
 * const enhancedClient = addAuthentication(client, {
 *   tokenProvider: () => localStorage.getItem('auth-token') || ''
 * })
 * .pipe(addRetry, { retries: 3 })
 * .pipe(addLogging);
 * ```
 */

// 🔐 Authentication middleware
export type {
  AuthenticationOptions,
  AuthTokenProvider,
} from './authentication';

export {
  addAuthentication,
  createAuthenticationMiddleware,
} from './authentication';

// 🛡️ Authorization middleware
export type {
  AuthorizationOptions,
  UnauthorizedHandler,
} from './authorization';

export {
  addAuthorization,
  createAuthorizationMiddleware,
} from './authorization';

// 💾 Cache middleware
export type {
  CacheOptions,
  CacheStorage,
  CacheEntry,
  CacheKeyGenerator,
} from './cache';

export { addCache, createCacheMiddleware } from './cache';

// 🔒 CSRF middleware
export { addCSRF } from './csrf';

// 📝 Logging middleware
export type { LoggingOptions, Logger, LogLevel } from './logging';

export { addLogging, createLoggingMiddleware } from './logging';

// 🚦 Rate limiting middleware
export type { RateLimitOptions, RateLimitAlgorithm } from './rate-limit';

export { addRateLimit, createRateLimitMiddleware } from './rate-limit';

// 🔄 Retry middleware
export type { RetryOptions } from './retry';

export { addRetry, createRetryMiddleware } from './retry';

/**
 * Common middleware combinations for typical use cases.
 * These provide pre-configured middleware stacks for common scenarios.
 */

import type { FetchClient } from '../client/fetch-client';
import { addAuthentication } from './authentication';
import { addRetry } from './retry';
import { addLogging } from './logging';
import { addCache } from './cache';
import { addRateLimit } from './rate-limit';

/**
 * Production-ready middleware stack with authentication, retry, logging, and caching.
 * Perfect for API clients that need reliability and observability.
 *
 * @param client - The FetchClient to enhance
 * @param config - Configuration for each middleware
 * @returns Enhanced FetchClient with production middleware stack
 *
 * @example
 * ```typescript
 * const apiClient = addProductionStack(new FetchClient(), {
 *   auth: { tokenProvider: () => getAuthToken() },
 *   cache: { ttl: 5 * 60 * 1000 }, // 5 minutes
 *   logging: { level: 'info' }
 * });
 * ```
 */
export function addProductionStack(
  client: FetchClient,
  config: {
    auth?: Parameters<typeof addAuthentication>[1];
    retry?: Parameters<typeof addRetry>[1];
    cache?: Parameters<typeof addCache>[1];
    logging?: Parameters<typeof addLogging>[1];
    rateLimit?: Parameters<typeof addRateLimit>[1];
  } = {},
): FetchClient {
  let enhanced = client;

  // Apply middleware in order: auth → cache → retry → rate-limit → logging
  if (config.auth) {
    enhanced = addAuthentication(enhanced, config.auth);
  }

  if (config.cache !== undefined) {
    enhanced = addCache(enhanced, config.cache);
  }

  if (config.retry !== undefined) {
    enhanced = addRetry(enhanced, config.retry);
  }

  if (config.rateLimit !== undefined) {
    enhanced = addRateLimit(enhanced, config.rateLimit);
  }

  if (config.logging !== undefined) {
    enhanced = addLogging(enhanced, config.logging);
  }

  return enhanced;
}

/**
 * Development-friendly middleware stack with comprehensive logging and retries.
 * Perfect for local development and debugging.
 *
 * @param client - The FetchClient to enhance
 * @param config - Configuration for development middleware
 * @returns Enhanced FetchClient with development middleware stack
 *
 * @example
 * ```typescript
 * const devClient = addDevelopmentStack(new FetchClient(), {
 *   auth: { tokenProvider: () => 'dev-token' }
 * });
 * ```
 */
export function addDevelopmentStack(
  client: FetchClient,
  config: {
    auth?: Parameters<typeof addAuthentication>[1];
  } = {},
): FetchClient {
  let enhanced = client;

  if (config.auth) {
    enhanced = addAuthentication(enhanced, config.auth);
  }

  // Development-optimized settings
  enhanced = addRetry(enhanced, {
    maxRetries: 1,
    delay: 100,
  });

  enhanced = addLogging(enhanced, {
    level: 'debug',
    includeRequestHeaders: true,
    includeResponseHeaders: true,
    includeRequestBody: true,
    includeResponseBody: true,
  });

  return enhanced;
}

/**
 * Basic middleware stack with just authentication and retry.
 * Perfect for simple API clients that need minimal overhead.
 *
 * @param client - The FetchClient to enhance
 * @param config - Basic configuration
 * @returns Enhanced FetchClient with basic middleware stack
 *
 * @example
 * ```typescript
 * const basicClient = addBasicStack(new FetchClient(), {
 *   auth: { tokenProvider: () => getToken() }
 * });
 * ```
 */
export function addBasicStack(
  client: FetchClient,
  config: {
    auth: Parameters<typeof addAuthentication>[1];
  },
): FetchClient {
  return addRetry(addAuthentication(client, config.auth), { maxRetries: 2 });
}

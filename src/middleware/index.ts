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
 * - Simple `use{Middleware}()` convenience functions  
 * - Advanced `create{Middleware}Middleware()` for custom scenarios
 * - Comprehensive TypeScript support
 * 
 * @example Quick setup with multiple middleware:
 * ```typescript
 * import { FetchClient } from '@fgrzl/fetch';
 * import { useAuthentication, useRetry, useLogging } from '@fgrzl/fetch/middleware';
 * 
 * const client = new FetchClient();
 * const enhancedClient = useAuthentication(client, {
 *   tokenProvider: () => localStorage.getItem('auth-token') || ''
 * })
 * .pipe(useRetry, { retries: 3 })
 * .pipe(useLogging);
 * ```
 */

// 🔐 Authentication middleware
export type { 
  AuthenticationOptions, 
  AuthTokenProvider 
} from './authentication';

export { 
  useAuthentication,
  createAuthenticationMiddleware 
} from './authentication';

// 🛡️ Authorization middleware  
export type { 
  AuthorizationOptions, 
  UnauthorizedHandler 
} from './authorization';

export { 
  useAuthorization,
  createAuthorizationMiddleware 
} from './authorization';

// 💾 Cache middleware
export type { 
  CacheOptions, 
  CacheStorage, 
  CacheEntry, 
  CacheKeyGenerator 
} from './cache';

export { 
  useCache,
  createCacheMiddleware 
} from './cache';

// 🔒 CSRF middleware
export { 
  useCSRF
} from './csrf';

// 📝 Logging middleware
export type { 
  LoggingOptions, 
  Logger, 
  LogLevel 
} from './logging';

export { 
  useLogging,
  createLoggingMiddleware 
} from './logging';

// 🚦 Rate limiting middleware
export type { 
  RateLimitOptions, 
  RateLimitAlgorithm 
} from './rate-limit';

export { 
  useRateLimit,
  createRateLimitMiddleware 
} from './rate-limit';

// 🔄 Retry middleware
export type { 
  RetryOptions 
} from './retry';

export { 
  useRetry,
  createRetryMiddleware 
} from './retry';

/**
 * Common middleware combinations for typical use cases.
 * These provide pre-configured middleware stacks for common scenarios.
 */

import type { FetchClient } from '../client/fetch-client';
import { useAuthentication } from './authentication';
import { useAuthorization } from './authorization';
import { useRetry } from './retry';
import { useLogging } from './logging';
import { useCache } from './cache';
import { useRateLimit } from './rate-limit';

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
 * const apiClient = useProductionStack(new FetchClient(), {
 *   auth: { tokenProvider: () => getAuthToken() },
 *   cache: { ttl: 5 * 60 * 1000 }, // 5 minutes
 *   logging: { level: 'info' }
 * });
 * ```
 */
export function useProductionStack(
  client: FetchClient,
  config: {
    auth?: Parameters<typeof useAuthentication>[1];
    retry?: Parameters<typeof useRetry>[1];
    cache?: Parameters<typeof useCache>[1];
    logging?: Parameters<typeof useLogging>[1];
    rateLimit?: Parameters<typeof useRateLimit>[1];
  } = {}
): FetchClient {
  let enhanced = client;

  // Apply middleware in order: auth → cache → retry → rate-limit → logging
  if (config.auth) {
    enhanced = useAuthentication(enhanced, config.auth);
  }

  if (config.cache !== undefined) {
    enhanced = useCache(enhanced, config.cache);
  }

  if (config.retry !== undefined) {
    enhanced = useRetry(enhanced, config.retry);
  }

  if (config.rateLimit !== undefined) {
    enhanced = useRateLimit(enhanced, config.rateLimit);
  }

  if (config.logging !== undefined) {
    enhanced = useLogging(enhanced, config.logging);
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
 * const devClient = useDevelopmentStack(new FetchClient(), {
 *   auth: { tokenProvider: () => 'dev-token' }
 * });
 * ```
 */
export function useDevelopmentStack(
  client: FetchClient,
  config: {
    auth?: Parameters<typeof useAuthentication>[1];
  } = {}
): FetchClient {
  let enhanced = client;

  if (config.auth) {
    enhanced = useAuthentication(enhanced, config.auth);
  }

  // Development-optimized settings
  enhanced = useRetry(enhanced, { 
    maxRetries: 1, 
    delay: 100 
  });

  enhanced = useLogging(enhanced, { 
    level: 'debug',
    includeRequestHeaders: true,
    includeResponseHeaders: true,
    includeRequestBody: true,
    includeResponseBody: true
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
 * const basicClient = useBasicStack(new FetchClient(), {
 *   auth: { tokenProvider: () => getToken() }
 * });
 * ```
 */
export function useBasicStack(
  client: FetchClient,
  config: {
    auth: Parameters<typeof useAuthentication>[1];
  }
): FetchClient {
  return useRetry(
    useAuthentication(client, config.auth),
    { maxRetries: 2 }
  );
}

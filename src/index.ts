/**
 * @fileoverview Main library entry point with "pit of success" architecture.
 *
 * This module exports everything users need in order of discoverability:
 * 1. Pre-configured client with smart defaults (80% of users start here)
 * 2. FetchClient for custom configurations
 * 3. Individual middleware functions for specific needs
 * 4. Pre-built middleware stacks for common scenarios
 * 5. Types for TypeScript users
 */

import { FetchClient } from './client/fetch-client';
import { useProductionStack } from './middleware';

/**
 * 🎯 PIT OF SUCCESS: Pre-configured fetch client (Level 1 - 80% of users)
 *
 * This client is ready to use out of the box with production-ready middleware:
 * - Authentication support (configure your token provider)
 * - Automatic retries with exponential backoff
 * - Response caching for GET requests
 * - Request/response logging
 * - Rate limiting protection
 * - Same-origin credentials for session-based auth (cookies)
 *
 * @example Just import and use:
 * ```typescript
 * import api from '@fgrzl/fetch';
 *
 * // Works immediately - no setup required!
 * const users = await api.get('/api/users');
 * const newUser = await api.post('/api/users', { name: 'John' });
 *
 * // With query parameters
 * const activeUsers = await api.get('/api/users', { status: 'active', limit: 10 });
 * ```
 *
 * @example Configure authentication:
 * ```typescript
 * import api from '@fgrzl/fetch';
 * import { useAuthentication } from '@fgrzl/fetch/middleware';
 *
 * const authClient = useAuthentication(api, {
 *   tokenProvider: () => localStorage.getItem('auth-token') || ''
 * });
 * ```
 *
 * @example For token-only auth (no cookies):
 * ```typescript
 * import { FetchClient, useAuthentication } from '@fgrzl/fetch';
 *
 * const tokenClient = useAuthentication(new FetchClient({
 *   credentials: 'omit' // Don't send cookies
 * }), {
 *   tokenProvider: () => getJWTToken()
 * });
 * ```
 */
const api = useProductionStack(
  new FetchClient({
    // Smart default: include cookies for session-based auth
    // Can be overridden by creating a custom FetchClient
    credentials: 'same-origin',
  }),
  {
    // Smart defaults - users can override as needed
    retry: {
      maxRetries: 2,
      delay: 1000,
    },
    cache: {
      ttl: 5 * 60 * 1000, // 5 minutes
      methods: ['GET'],
    },
    logging: {
      level: 'info',
    },
    rateLimit: {
      maxRequests: 100,
      windowMs: 60 * 1000, // 100 requests per minute
    },
  },
);

// 🎯 LEVEL 1: Export the production-ready client as default
export default api;

// 🎯 LEVEL 2: FetchClient for custom configurations
export { FetchClient } from './client/fetch-client';
export { FetchError, HttpError, NetworkError } from './errors';

// 🎯 LEVEL 3: Individual middleware functions (import from our comprehensive middleware index)
export {
  // Authentication
  useAuthentication,
  createAuthenticationMiddleware,
  // Authorization
  useAuthorization,
  createAuthorizationMiddleware,
  // Cache
  useCache,
  createCacheMiddleware,
  // CSRF
  useCSRF,
  // Logging
  useLogging,
  createLoggingMiddleware,
  // Rate Limiting
  useRateLimit,
  createRateLimitMiddleware,
  // Retry
  useRetry,
  createRetryMiddleware,
} from './middleware';

// 🎯 LEVEL 4: Pre-built middleware stacks for common scenarios
export {
  useProductionStack,
  useDevelopmentStack,
  useBasicStack,
} from './middleware';

// 🎯 LEVEL 5: Types for TypeScript users
export type { FetchMiddleware as InterceptMiddleware } from './client/fetch-client';
export type { FetchResponse, FetchClientOptions } from './client/types';

// Middleware types (re-exported from middleware index)
export type {
  // Authentication types
  AuthenticationOptions,
  AuthTokenProvider,
  // Authorization types
  AuthorizationOptions,
  UnauthorizedHandler,
  // Cache types
  CacheOptions,
  CacheStorage,
  CacheEntry,
  CacheKeyGenerator,
  // Logging types
  LoggingOptions,
  Logger,
  LogLevel,
  // Rate limiting types
  RateLimitOptions,
  RateLimitAlgorithm,
  // Retry types
  RetryOptions,
} from './middleware';

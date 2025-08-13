/**
 * @fileoverview Main library entry point with enhanced middleware architecture.
 *
 * This module exports everything users need in order of discoverability:
 * 1. Pre-configured client (most users start here)
 * 2. Enhanced client for custom configurations
 * 3. Enhanced middleware functions for all patterns
 * 4. Types for TypeScript users
 */

import { FetchClient } from './client/fetch-client';
// import { createSimpleCSRFMiddleware, createSimpleAuthMiddleware } from './middleware/simple-enhanced';

/**
 * 🎯 PIT OF SUCCESS: Pre-configured fetch client (Level 1 - 80% of users)
 *
 * This client is ready to use out of the box with:
 * - Enhanced middleware architecture with full retry capabilities
 * - Same-origin credentials policy for cookie handling
 * - Ready for middleware configuration
 *
 * @example
 * ```typescript
 * import api from '@fgrzl/fetch';
 *
 * // Just works - no configuration needed!
 * const users = await api.get('/api/users');
 * const newUser = await api.post('/api/users', { name: 'John' });
 * ```
 */
const api = new FetchClient({
  credentials: 'same-origin',
});

// TODO: Configure with middleware once we restructure middleware
// api.use(createSimpleCSRFMiddleware(() => {
//   // Default CSRF token extraction from cookie
//   if (typeof document !== 'undefined') {
//     return document.cookie
//       .split('; ')
//       .find(row => row.startsWith('XSRF-TOKEN='))
//       ?.split('=')[1] || '';
//   }
//   return '';
// }));

// api.use(createSimpleAuthMiddleware(() => {
//   // Default: no auth token (can be configured by user)
//   return '';
// }));

// 🎯 LEVEL 1: Export the pre-configured enhanced client as default
export default api;

// 🎯 LEVEL 2: Enhanced client for custom configurations
export { FetchClient } from './client/fetch-client';
export { FetchError, HttpError, NetworkError } from './errors';

// 🎯 LEVEL 3: Enhanced middleware functions for all patterns
export { useRetry, createRetryMiddleware } from './middleware/retry';
export type { RetryOptions } from './middleware/retry';
export { useCSRF, createCSRFMiddleware } from './middleware/csrf';
export type { CSRFOptions, CSRFTokenProvider } from './middleware/csrf';
export { useAuthentication, createAuthenticationMiddleware } from './middleware/authentication';
export type { AuthenticationOptions, AuthTokenProvider } from './middleware/authentication';
export { useAuthorization, createAuthorizationMiddleware } from './middleware/authorization';
export type { AuthorizationOptions, UnauthorizedHandler } from './middleware/authorization';
export { useCache, createCacheMiddleware } from './middleware/cache';
export type { CacheOptions, CacheStorage, CacheEntry } from './middleware/cache';
export { useLogging, createLoggingMiddleware } from './middleware/logging';
export type { LoggingOptions, Logger, LogEntry, LogLevel } from './middleware/logging';
export { useRateLimit, createRateLimitMiddleware } from './middleware/rate-limit';
export type { RateLimitOptions } from './middleware/rate-limit';

// 🎯 LEVEL 4: Types for TypeScript users
export type { FetchMiddleware as InterceptMiddleware } from './client/fetch-client';
export type { FetchResponse, FetchClientOptions } from './client/types';

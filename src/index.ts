/**
 * @fileoverview Main library entry point following "pit of success" pattern.
 *
 * This module exports everything users need in order of discoverability:
 * 1. Pre-configured client (most users start here)
 * 2. Core classes for custom configurations  
 * 3. Middleware functions for common patterns
 * 4. Types for TypeScript users
 */

import { FetchClient } from './client';
import { useCSRF, useAuthorization } from './middleware';

/**
 * 🎯 PIT OF SUCCESS: Pre-configured fetch client (Level 1 - 80% of users)
 *
 * This client is ready to use out of the box with:
 * - CSRF protection using standard XSRF-TOKEN/X-XSRF-TOKEN
 * - Automatic redirect to '/login' on 401 Unauthorized responses  
 * - Same-origin credentials policy for cookie handling
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

// Configure with sensible defaults
useCSRF(api);
useAuthorization(api, { url: '/login' });

// 🎯 LEVEL 1: Export the pre-configured client as default
export default api;

// 🎯 LEVEL 2: Core classes for custom client creation (20% of users)
export { FetchClient } from './client';
export { FetchError, HttpError, NetworkError } from './errors';

// 🎯 LEVEL 3: Middleware functions for common patterns (TypeScript/advanced users)
export * from './middleware';

// 🎯 LEVEL 4: Types for TypeScript users (auto-discovered via IntelliSense)
export type {
  RequestMiddleware,
  ResponseMiddleware,
  FetchClientConfig,
  FetchResponse,
} from './client';

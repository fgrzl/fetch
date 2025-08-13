/**
 * @fileoverview Default configured fetch client with CSRF protection and unauthorized handling.
 *
 * This module exports a pre-configured FetchClient instance with:
 * - Same-origin credentials policy
 * - CSRF protection using 'csrf_token' cookie and 'X-CSRF-Token' header
 * - Automatic redirect to '/login' on 401 Unauthorized responses
 */

import { FetchClient } from './client';
import { useCSRF, useUnauthorized } from './middleware';

/**
 * Pre-configured fetch client with CSRF protection and unauthorized handling.
 *
 * This client is ready to use for applications that need:
 * - CSRF protection
 * - Automatic login redirects on authentication failures
 * - Same-origin cookie handling
 *
 * @example
 * ```typescript
 * import api from '@fgrzl/fetch';
 *
 * // GET request
 * const users = await api.get('/api/users');
 *
 * // POST request (automatically includes CSRF token)
 * const newUser = await api.post('/api/users', { name: 'John' });
 * ```
 */
const api = new FetchClient({
  credentials: 'same-origin',
});

// Configure CSRF protection
useCSRF(api, {});

// Configure unauthorized redirect
useUnauthorized(api, {
  url: '/login',
});

export default api;

// Export error classes and types for consumers
export { FetchError, HttpError, NetworkError } from './errors';
export { FetchClient } from './client';
export type {
  RequestMiddleware,
  ResponseMiddleware,
  FetchClientConfig,
  FetchResponse,
} from './client';
export { useCSRF, useUnauthorized } from './middleware';
export type { UnauthorizedOptions } from './middleware';

/**
 * @fileoverview CSRF protection middleware - "pit of success" API.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { CSRFOptions } from './types';
import { createCSRFMiddleware } from './csrf';

// Re-export types for convenience
export type { CSRFOptions, CSRFTokenProvider } from './types';
export { createCSRFMiddleware } from './csrf';

/**
 * "Pit of success" API for adding CSRF protection to a FetchClient.
 * Uses smart defaults that work with most web frameworks out of the box.
 *
 * Default behavior:
 * - Reads CSRF token from XSRF-TOKEN cookie
 * - Adds X-XSRF-TOKEN header to POST, PUT, PATCH, DELETE requests
 * - Skips GET/HEAD requests (they don't need CSRF protection)
 *
 * @param client - The FetchClient to add CSRF protection to
 * @param options - Optional CSRF configuration
 * @returns A new FetchClient with CSRF protection
 *
 * @example Basic usage (automatic cookie-based CSRF):
 * ```typescript
 * const client = new FetchClient();
 * const protectedClient = useCSRF(client);
 *
 * // CSRF token automatically added to POST requests
 * await protectedClient.post('/api/users', { name: 'John' });
 * ```
 *
 * @example Custom token provider:
 * ```typescript
 * const protectedClient = useCSRF(client, {
 *   tokenProvider: () => localStorage.getItem('csrf-token') || ''
 * });
 * ```
 *
 * @example Custom header and cookie names:
 * ```typescript
 * const protectedClient = useCSRF(client, {
 *   headerName: 'X-CSRF-Token',
 *   cookieName: 'csrf-token'
 * });
 * ```
 *
 * @example Skip patterns for external APIs:
 * ```typescript
 * const protectedClient = useCSRF(client, {
 *   skipPatterns: [
 *     /^https:\/\/api\.external\.com\//,  // Skip external API
 *     '/webhook/',                        // Skip webhook endpoints
 *     '/public-api/'                      // Skip public API endpoints
 *   ]
 * });
 * ```
 */
export function useCSRF(
  client: FetchClient,
  options: CSRFOptions = {},
): FetchClient {
  return client.use(createCSRFMiddleware(options));
}

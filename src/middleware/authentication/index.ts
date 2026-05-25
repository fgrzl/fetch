/**
 * @fileoverview Authentication middleware public API.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { AuthenticationOptions } from './types';
import { createAuthenticationMiddleware } from './authentication';

// Re-export types for convenience
export type { AuthenticationOptions, AuthTokenProvider } from './types';
export { createAuthenticationMiddleware } from './authentication';

/**
 * Adds authentication headers to a FetchClient.
 * Automatically adds Bearer tokens to requests.
 *
 * @param client - The FetchClient to add authentication to
 * @param options - Authentication configuration
 * @returns A new FetchClient with authentication middleware
 *
 * @example Basic token from localStorage:
 * ```typescript
 * const authClient = addAuthentication(client, {
 *   tokenProvider: () => localStorage.getItem('auth-token') || ''
 * });
 * ```
 *
 * @example Async token with refresh:
 * ```typescript
 * const authClient = addAuthentication(client, {
 *   tokenProvider: async () => {
 *     let token = localStorage.getItem('auth-token');
 *     if (!token || isExpired(token)) {
 *       token = await refreshToken();
 *     }
 *     return token || '';
 *   }
 * });
 * ```
 */
export function addAuthentication(
  client: FetchClient,
  options: AuthenticationOptions,
): FetchClient {
  return client.use(createAuthenticationMiddleware(options));
}

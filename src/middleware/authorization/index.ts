/**
 * @fileoverview Authorization middleware - "pit of success" API.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { AuthorizationOptions } from './types';
import { createAuthorizationMiddleware } from './authorization';

// Re-export types for convenience
export type { AuthorizationOptions, UnauthorizedHandler } from './types';
export { createAuthorizationMiddleware } from './authorization';

/**
 * "Pit of success" API for adding authorization handling to a FetchClient.
 * Automatically handles 401 Unauthorized responses.
 *
 * @param client - The FetchClient to add authorization handling to
 * @param options - Authorization configuration
 * @returns A new FetchClient with authorization middleware
 *
 * @example Basic redirect on 401:
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   onUnauthorized: () => {
 *     localStorage.removeItem('auth-token');
 *     window.location.href = '/login';
 *   }
 * });
 * ```
 *
 * @example Handle multiple status codes:
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   onUnauthorized: () => redirectToLogin(),
 *   onForbidden: () => showAccessDenied(),
 *   statusCodes: [401, 403]
 * });
 * ```
 */
export function useAuthorization(
  client: FetchClient,
  options: AuthorizationOptions,
): FetchClient {
  return client.use(createAuthorizationMiddleware(options));
}

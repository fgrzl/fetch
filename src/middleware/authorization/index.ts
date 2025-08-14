/**
 * @fileoverview Authorization middleware - "pit of success" API.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { AuthorizationOptions } from './types';
import { createAuthorizationMiddleware } from './authorization';

// Re-export types for convenience
export type { AuthorizationOptions, UnauthorizedHandler, RedirectAuthorizationConfig } from './types';
export { createAuthorizationMiddleware } from './authorization';

/**
 * "Pit of success" API for adding authorization handling to a FetchClient.
 * Automatically handles 401 Unauthorized responses.
 *
 * @param client - The FetchClient to add authorization handling to
 * @param options - Authorization configuration (optional)
 * @returns A new FetchClient with authorization middleware
 *
 * @example Smart defaults - no configuration needed:
 * ```typescript
 * const authzClient = useAuthorization(client);
 * // Redirects to '/login?return_url=current-page' on 401
 * ```
 *
 * @example Custom redirect path:
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   redirectConfig: { redirectPath: '/signin', returnUrlParam: 'redirect_to' }
 * });
 * ```
 *
 * @example Manual handler (full control):
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
 *   onForbidden: () => showAccessDenied(),
 *   statusCodes: [401, 403]
 * });
 * ```
 */
export function useAuthorization(
  client: FetchClient,
  options: AuthorizationOptions = {},
): FetchClient {
  return client.use(createAuthorizationMiddleware(options));
}

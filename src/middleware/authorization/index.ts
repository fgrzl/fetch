/**
 * @fileoverview Explicit authorization response-handler middleware.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { AuthorizationOptions } from './types';
import { createAuthorizationMiddleware } from './authorization';

export type { AuthorizationOptions, UnauthorizedHandler } from './types';
export { createAuthorizationMiddleware } from './authorization';

/**
 * Adds explicit authorization response handlers to a client.
 *
 * @param client - The client to configure.
 * @param options - Handler and status configuration.
 * @returns The configured client.
 *
 * @example
 * ```typescript
 * addAuthorization(client, {
 *   onUnauthorized: () => window.location.assign('/login')
 * });
 * ```
 */
export function addAuthorization(
  client: FetchClient,
  options: AuthorizationOptions,
): FetchClient {
  return client.use(createAuthorizationMiddleware(options));
}

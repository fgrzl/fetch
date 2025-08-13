import { ResponseMiddleware, FetchClient } from '../../client';
import type { AuthorizationOptions } from './types';

/**
 * Creates a response middleware that handles 401 Unauthorized responses
 * by redirecting to a login page with a return URL.
 *
 * @param config - Configuration options
 * @returns Response middleware function
 */
export function createAuthorizationMiddleware(
  config: AuthorizationOptions = {},
): ResponseMiddleware {
  return async (req, res) => {
    if (res.status === 401) {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      const returnToParam = config.param || 'redirect_uri';
      const loginUrl = config.url || '/login';
      window.location.href = `${loginUrl}?${returnToParam}=${returnTo}`;
    }
    return res;
  };
}

/**
 * Configures automatic redirection for unauthorized responses.
 *
 * When a 401 Unauthorized response is received, this middleware will
 * automatically redirect the browser to the specified login page,
 * including the current URL as a return parameter for post-login redirection.
 *
 * @param client - The FetchClient instance to configure
 * @param config - Configuration options including the login URL and optional return parameter name
 *
 * @example
 * ```typescript
 * // Minimal usage with all defaults
 * const client = new FetchClient();
 * useAuthorization(client, {});
 *
 * // With custom login URL
 * useAuthorization(client, {
 *   url: '/auth/signin'
 * });
 *
 * // With custom return parameter name
 * useAuthorization(client, {
 *   param: 'returnTo'
 * });
 *
 * // With both custom URL and parameter
 * useAuthorization(client, {
 *   url: '/login',
 *   param: 'returnTo'
 * });
 * ```
 */
export function useAuthorization(
  client: FetchClient,
  config: AuthorizationOptions = {},
) {
  client.useResponseMiddleware(createAuthorizationMiddleware(config));
}

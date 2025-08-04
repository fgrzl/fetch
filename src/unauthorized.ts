import { ResponseMiddleware, FetchClient } from './client';

/**
 * Configuration options for unauthorized redirect middleware.
 */
export interface UnauthorizedConfig {
  /** Path to redirect to when a 401 Unauthorized response is received */
  loginPath: string;
}

/**
 * Creates a response middleware that handles 401 Unauthorized responses
 * by redirecting to a login page with a return URL.
 * 
 * @param config - Configuration options
 * @returns Response middleware function
 */
function unauthorizedRedirectMiddleware(
  config: UnauthorizedConfig,
): ResponseMiddleware {
  return async (res) => {
    if (res.status === 401) {
      const returnTo = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `${config.loginPath}?returnTo=${returnTo}`;
    }
    return res;
  };
}

/**
 * Configures automatic redirection for unauthorized responses.
 * 
 * When a 401 Unauthorized response is received, this middleware will
 * automatically redirect the browser to the specified login page,
 * including the current URL as a returnTo parameter for post-login redirection.
 * 
 * @param client - The FetchClient instance to configure
 * @param config - Configuration options including the login path
 * 
 * @example
 * ```typescript
 * const client = new FetchClient();
 * useUnauthorized(client, {
 *   loginPath: '/login'
 * });
 * ```
 */
export function useUnauthorized(
  client: FetchClient,
  config: UnauthorizedConfig,
) {
  client.useResponseMiddleware(unauthorizedRedirectMiddleware(config));
}

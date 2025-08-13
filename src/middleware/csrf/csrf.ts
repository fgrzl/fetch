import { FetchClient, RequestMiddleware } from '../../client';
import type { CsrfOptions } from './types';

/**
 * Creates a request middleware that adds CSRF token to requests.
 * Reads the token from a cookie and adds it as a header.
 *
 * @param config - CSRF configuration options
 * @returns Request middleware function
 */
function csrfMiddleware(config: CsrfOptions): RequestMiddleware {
  return async (req, url) => {
    const cookieName = config.cookieName || 'XSRF-TOKEN';
    const headerName = config.headerName || 'X-XSRF-TOKEN';

    const cookie = document.cookie.match(new RegExp(`${cookieName}=([^;]+)`));
    const token = cookie?.[1];
    const headers = {
      ...req.headers,
      'Content-Type': 'application/json',
      ...(token && { [headerName]: token }),
    };
    return [{ ...req, headers }, url];
  };
}

/**
 * Configures CSRF protection for a FetchClient.
 *
 * This function adds middleware that:
 * - Reads CSRF tokens from cookies and includes them in request headers
 * - Updates CSRF tokens from response headers back to cookies
 * - Automatically sets Content-Type to application/json for requests
 *
 * @param client - The FetchClient instance to configure
 * @param config - CSRF configuration options
 *
 * @example
 * ```typescript
 * // Use defaults (XSRF-TOKEN cookie, X-XSRF-TOKEN header)
 * const client = new FetchClient();
 * useCSRF(client, {});
 *
 * // Or with no config at all
 * useCSRF(client);
 *
 * // Custom cookie and header names
 * useCSRF(client, {
 *   cookieName: 'csrf_token',
 *   headerName: 'X-CSRF-Token'
 * });
 * ```
 */
export function useCSRF(client: FetchClient, config: CsrfOptions = {}) {
  client.useRequestMiddleware(csrfMiddleware(config));
  client.useResponseMiddleware(async (res) => {
    const cookieName = config.cookieName || 'XSRF-TOKEN';
    const headerName = config.headerName || 'X-XSRF-TOKEN';

    const csrfToken = res.headers.get(headerName);
    if (csrfToken) {
      document.cookie = `${cookieName}=${csrfToken}; path=/;`;
    }
    return res;
  });
}

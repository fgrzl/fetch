import { FetchClient, RequestMiddleware } from '../../client';
import type { CSRFOptions } from './types';

/**
 * Creates a request middleware that adds CSRF token to requests.
 * Reads the token from a cookie and adds it as a header.
 *
 * @param config - CSRF configuration options
 * @returns Request middleware function
 */
export function createCSRFMiddleware(config: CSRFOptions = {}): RequestMiddleware {
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
 *   cookieName: 'XSRF-TOKEN',
 *   headerName: 'X-XSRF-TOKEN'
 * });
 * ```
 */
export function useCSRF(client: FetchClient, config: CSRFOptions = {}) {
  client.useRequestMiddleware(createCSRFMiddleware(config));
  client.useResponseMiddleware(async (req, res) => {
    const cookieName = config.cookieName || 'XSRF-TOKEN';
    const headerName = config.headerName || 'X-XSRF-TOKEN';

    const CSRFToken = res.headers.get(headerName);
    if (CSRFToken) {
      document.cookie = `${cookieName}=${CSRFToken}; path=/;`;
    }
    return res;
  });
}

import { FetchClient, RequestMiddleware } from './client';

/**
 * Configuration options for CSRF protection middleware.
 */
interface CsrfConfig {
  /** Name of the cookie that contains the CSRF token */
  cookieName: string;
  /** Name of the HTTP header to send the CSRF token in */
  headerName: string;
}

/**
 * Creates a request middleware that adds CSRF token to requests.
 * Reads the token from a cookie and adds it as a header.
 *
 * @param config - CSRF configuration options
 * @returns Request middleware function
 */
function csrfMiddleware(config: CsrfConfig): RequestMiddleware {
  return async (req, url) => {
    const cookie = document.cookie.match(
      new RegExp(`${config.cookieName}=([^;]+)`),
    );
    const token = cookie?.[1];
    const headers = {
      ...req.headers,
      'Content-Type': 'application/json',
      ...(token && { [config.headerName]: token }),
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
 * const client = new FetchClient();
 * useCSRF(client, {
 *   cookieName: 'csrf_token',
 *   headerName: 'X-CSRF-Token'
 * });
 * ```
 */
export function useCSRF(client: FetchClient, config: CsrfConfig) {
  client.useRequestMiddleware(csrfMiddleware(config));
  client.useResponseMiddleware(async (res) => {
    const csrfToken = res.headers.get(config.headerName);
    if (csrfToken) {
      document.cookie = `${config.cookieName}=${csrfToken}; path=/;`;
    }
    return res;
  });
}

/**
 * Configuration options for CSRF protection middleware.
 */
export interface CsrfOptions {
  /** Name of the cookie that contains the CSRF token. Defaults to 'XSRF-TOKEN' */
  cookieName?: string;
  /** Name of the HTTP header to send the CSRF token in. Defaults to 'X-XSRF-TOKEN' */
  headerName?: string;
}

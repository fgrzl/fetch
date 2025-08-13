/**
 * Configuration options for authorization redirect middleware.
 */
export interface AuthorizationOptions {
  /** URL to redirect to when a 401 Unauthorized response is received. Defaults to '/login' */
  url?: string;
  /** Name of the return URL parameter. Defaults to 'redirect_uri' */
  param?: string;
}

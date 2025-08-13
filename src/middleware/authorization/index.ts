/**
 * Authorization Redirect Middleware
 *
 * This middleware handles 401 Unauthorized responses by:
 * - Automatically redirecting to a login page
 * - Preserving the current URL for post-login redirection
 * - Using OAuth 2.0 standard redirect_uri parameter by default
 *
 * @example
 * ```typescript
 * import { useAuthorization } from '@fgrzl/fetch';
 *
 * const client = new FetchClient();
 * useAuthorization(client); // Redirects to /login with redirect_uri param
 * ```
 */

export { useAuthorization } from './authorization';
export type { AuthorizationOptions } from './types';

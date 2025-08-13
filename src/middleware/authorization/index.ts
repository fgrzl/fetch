/**
 * Authorization Redirect Middleware - "Pit of Success" pattern
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
 * useAuthorization(client); // Just works - redirects to /login!
 * ```
 */

// 🎯 LEVEL 1: Main function users need (simple, sensible defaults)
export { useAuthorization } from './authorization-middleware';

// 🎯 LEVEL 2: Configuration type for TypeScript users
export type { AuthorizationOptions } from './types';

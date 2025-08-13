/**
 * CSRF Protection Middleware
 *
 * This middleware provides Cross-Site Request Forgery (CSRF) protection by:
 * - Reading CSRF tokens from cookies and adding them to request headers
 * - Updating CSRF tokens from response headers back to cookies
 * - Using industry-standard XSRF-TOKEN/X-XSRF-TOKEN by default
 *
 * @example
 * ```typescript
 * import { useCSRF } from '@fgrzl/fetch';
 *
 * const client = new FetchClient();
 * useCSRF(client); // Uses defaults
 * ```
 */

export { useCSRF } from './csrf';
export type { CsrfOptions } from './types';

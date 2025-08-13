/**
 * CSRF Protection Middleware - "Pit of Success" pattern
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
 * useCSRF(client); // Just works with sensible defaults!
 * ```
 */

// 🎯 LEVEL 1: Main function users need (simple, works out of the box)
export { useCSRF } from './csrf-middleware';

// 🎯 LEVEL 2: Configuration type for TypeScript users
export type { CsrfOptions } from './types';

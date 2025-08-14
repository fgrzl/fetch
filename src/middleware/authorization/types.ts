/**
 * @fileoverview Authorization middleware types and configuration.
 */

import type { FetchResponse } from '../../client/types';

/**
 * Handler function for unauthorized/forbidden responses.
 */
export type UnauthorizedHandler = (
  response: FetchResponse<unknown>,
  request: RequestInit & { url?: string },
) => void | Promise<void>;

/**
 * Authorization configuration options - optimized for "pit of success".
 *
 * Smart defaults:
 * - Handles 401 Unauthorized responses
 * - Optionally handles 403 Forbidden responses
 * - Graceful error handling
 */
export interface AuthorizationOptions {
  /**
   * Handler called when 401 Unauthorized response is received.
   *
   * @param response - The 401 response object
   * @param request - The original request that was unauthorized
   *
   * @example Redirect to login:
   * ```typescript
   * onUnauthorized: () => {
   *   window.location.href = '/login';
   * }
   * ```
   *
   * @example Clear token and reload:
   * ```typescript
   * onUnauthorized: () => {
   *   localStorage.removeItem('auth-token');
   *   window.location.reload();
   * }
   * ```
   */
  onUnauthorized: UnauthorizedHandler;

  /**
   * Handler called when 403 Forbidden response is received.
   * Optional - if not provided, 403 responses are ignored.
   *
   * @param response - The 403 response object
   * @param request - The original request that was forbidden
   */
  onForbidden?: UnauthorizedHandler;

  /**
   * Skip authorization handling for requests matching these URL patterns
   * Useful for login/public endpoints where 401 is expected
   *
   * @example
   * ```typescript
   * skipPatterns: ['/login', '/register', /^\/public\//]
   * ```
   */
  skipPatterns?: (RegExp | string)[];

  /**
   * Status codes to handle (default: [401])
   * You can add 403 if you want to handle forbidden responses
   */
  statusCodes?: number[];
}

// Ensure this file is treated as a module
export {};

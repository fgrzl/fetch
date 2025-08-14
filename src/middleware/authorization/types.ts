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
 * Smart default configuration for redirect-based authorization handling.
 */
export interface RedirectAuthorizationConfig {
  /**
   * Path to redirect to on unauthorized response (default: '/login')
   */
  redirectPath?: string;
  
  /**
   * Query parameter name for the return URL (default: 'return_url')
   */
  returnUrlParam?: string;
  
  /**
   * Whether to include the current URL as a return URL (default: true)
   * Set to false if you don't want the return URL functionality
   */
  includeReturnUrl?: boolean;
}

/**
 * Authorization configuration options - optimized for "pit of success".
 *
 * Smart defaults:
 * - Handles 401 Unauthorized responses
 * - Optionally handles 403 Forbidden responses
 * - Graceful error handling
 * - When no options provided, defaults to redirecting to /login with return URL
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
  onUnauthorized?: UnauthorizedHandler;

  /**
   * Smart default configuration for redirect-based authorization.
   * When provided, creates a default onUnauthorized handler that redirects
   * to the login page with a return URL.
   * 
   * @example Use defaults (redirects to '/login?return_url=current-page'):
   * ```typescript
   * redirectConfig: {}
   * ```
   * 
   * @example Custom redirect path:
   * ```typescript
   * redirectConfig: { redirectPath: '/signin' }
   * ```
   */
  redirectConfig?: RedirectAuthorizationConfig;

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

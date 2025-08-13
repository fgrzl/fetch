/**
 * @fileoverview CSRF protection middleware types and configuration.
 */

/**
 * CSRF token provider function.
 * Should return the current CSRF token or empty string if not available.
 */
export type CSRFTokenProvider = () => string;

/**
 * CSRF configuration options - optimized for "pit of success".
 *
 * Smart defaults:
 * - Uses standard X-XSRF-TOKEN header
 * - Automatically extracts token from XSRF-TOKEN cookie
 * - Only adds token to state-changing methods (POST, PUT, PATCH, DELETE)
 */
export interface CSRFOptions {
  /**
   * Function to get the current CSRF token.
   * Default: extracts from XSRF-TOKEN cookie (standard Rails/Laravel convention)
   *
   * @returns The CSRF token or empty string if not available
   *
   * @example Custom token provider:
   * ```typescript
   * const getToken = () => localStorage.getItem('csrf-token') || '';
   * ```
   */
  tokenProvider?: CSRFTokenProvider;

  /**
   * Header name to use for CSRF token (default: 'X-XSRF-TOKEN')
   * Common alternatives: 'X-CSRF-Token', 'X-CSRFToken'
   */
  headerName?: string;

  /**
   * Cookie name to read token from when using default provider (default: 'XSRF-TOKEN')
   * Common alternatives: 'csrf-token', '_token'
   */
  cookieName?: string;

  /**
   * HTTP methods that require CSRF protection (default: ['POST', 'PUT', 'PATCH', 'DELETE'])
   * GET and HEAD requests typically don't need CSRF tokens
   */
  protectedMethods?: string[];

  /**
   * Skip CSRF protection for requests matching these URL patterns
   * Useful for external API calls that don't need CSRF tokens
   *
   * @example
   * ```typescript
   * skipPatterns: [/^https:\/\/api\.external\.com\//, '/public-api/']
   * ```
   */
  skipPatterns?: (RegExp | string)[];
}

// Ensure this file is treated as a module
export {};

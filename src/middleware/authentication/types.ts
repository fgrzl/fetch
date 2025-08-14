/**
 * @fileoverview Authentication middleware types and configuration.
 */

/**
 * Authentication token provider function.
 * Should return the current auth token or empty string if not available.
 */
export type AuthTokenProvider = () => string | Promise<string>;

/**
 * Authentication configuration options - optimized for "pit of success".
 *
 * Smart defaults:
 * - Uses standard Authorization header with Bearer token
 * - Applies to all requests by default
 * - Graceful handling when token is unavailable
 */
export interface AuthenticationOptions {
  /**
   * Function to get the current authentication token.
   * Can be synchronous or asynchronous.
   *
   * @returns The auth token or empty string if not available
   *
   * @example Token from localStorage:
   * ```typescript
   * const getToken = () => localStorage.getItem('auth-token') || '';
   * ```
   *
   * @example Async token refresh:
   * ```typescript
   * const getToken = async () => {
   *   const token = localStorage.getItem('auth-token');
   *   if (!token || isExpired(token)) {
   *     return await refreshToken();
   *   }
   *   return token;
   * };
   * ```
   */
  tokenProvider: AuthTokenProvider;

  /**
   * Header name for the authentication token (default: 'Authorization')
   * The token will be prefixed with the tokenType
   */
  headerName?: string;

  /**
   * Token type prefix (default: 'Bearer')
   * Common alternatives: 'Token', 'JWT', 'ApiKey'
   */
  tokenType?: string;

  /**
   * Skip authentication for requests matching these URL patterns
   * Useful for public endpoints that don't need auth
   *
   * @example
   * ```typescript
   * skipPatterns: [/^\/public\//, '/health', '/login']
   * ```
   */
  skipPatterns?: (RegExp | string)[];

  /**
   * Only apply authentication to requests matching these patterns
   * If specified, only these patterns will get auth headers
   *
   * @example
   * ```typescript
   * includePatterns: [/^\/api\//, '/graphql']
   * ```
   */
  includePatterns?: (RegExp | string)[];
}

// Ensure this file is treated as a module
export {};

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

  /**
   * When true, fail fast with a synthetic 401 when the token is missing or
   * tokenProvider throws, instead of sending the request without auth.
   * Reduces unnecessary 401s from the server and lets onUnauthorized run
   * without a round-trip.
   *
   * Default: false (proceed without auth when token missing, which often
   * causes a real 401 from the server).
   *
   * @example
   * ```typescript
   * addAuthentication(client, {
   *   tokenProvider: () => getToken(),
   *   requireToken: true, // no request sent when token missing
   * });
   * ```
   */
  requireToken?: boolean;
}

// Ensure this file is treated as a module
export {};

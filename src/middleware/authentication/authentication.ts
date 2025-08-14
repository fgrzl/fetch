/**
 * @fileoverview Authentication middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { AuthenticationOptions } from './types';

/**
 * Checks if a URL should skip authentication based on configured patterns.
 */
function shouldSkipAuth(
  url: string,
  skipPatterns: (RegExp | string)[] = [],
): boolean {
  return skipPatterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}

/**
 * Checks if a URL should include authentication based on configured patterns.
 */
function shouldIncludeAuth(
  url: string,
  includePatterns?: (RegExp | string)[],
): boolean {
  if (!includePatterns || includePatterns.length === 0) {
    return true; // Include by default if no patterns specified
  }

  return includePatterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}

/**
 * Creates authentication middleware with smart defaults.
 * Automatically adds Bearer tokens to requests.
 *
 * @param options - Authentication configuration options
 * @returns Authentication middleware for use with FetchClient
 *
 * @example Basic usage:
 * ```typescript
 * const authClient = useAuthentication(client, {
 *   tokenProvider: () => localStorage.getItem('token') || ''
 * });
 * ```
 *
 * @example Async token provider:
 * ```typescript
 * const authClient = useAuthentication(client, {
 *   tokenProvider: async () => {
 *     const token = await getAuthToken();
 *     return token || '';
 *   }
 * });
 * ```
 */
export function createAuthenticationMiddleware(
  options: AuthenticationOptions,
): FetchMiddleware {
  const {
    tokenProvider,
    headerName = 'Authorization',
    tokenType = 'Bearer',
    skipPatterns = [],
    includePatterns,
  } = options;

  return async (request, next) => {
    const url = request.url || '';
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;

    // Skip authentication if:
    // 1. URL matches a skip pattern
    // 2. URL doesn't match include patterns (if specified)
    if (
      shouldSkipAuth(pathname, skipPatterns) ||
      !shouldIncludeAuth(pathname, includePatterns)
    ) {
      return next(request);
    }

    try {
      // Get auth token (may be async)
      const token = await tokenProvider();

      // Skip if no token available
      if (!token) {
        return next(request);
      }

      // Add auth header to request
      const headers = new Headers(request.headers);
      headers.set(headerName, `${tokenType} ${token}`);

      // Create modified request with auth header
      const modifiedRequest = {
        ...request,
        headers,
      };

      return next(modifiedRequest);
    } catch {
      // If token provider fails, proceed without auth
      // This ensures network requests don't fail due to auth issues
      return next(request);
    }
  };
}

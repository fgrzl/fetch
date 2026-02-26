/**
 * @fileoverview Authentication middleware implementation.
 */

import type { FetchResponse } from '../../client/types';
import type { FetchMiddleware } from '../../client/fetch-client';
import type { AuthenticationOptions } from './types';

/** Synthetic 401 response when requireToken is set and token is missing or provider throws. */
function syntheticUnauthorized(
  url: string,
  message: string,
): FetchResponse<null> {
  return {
    data: null,
    status: 401,
    statusText: 'Unauthorized',
    headers: new Headers(),
    url,
    ok: false,
    error: { message },
  };
}

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
 * const authClient = addAuthentication(client, {
 *   tokenProvider: () => localStorage.getItem('token') || ''
 * });
 * ```
 *
 * @example Async token provider:
 * ```typescript
 * const authClient = addAuthentication(client, {
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
    requireToken = false,
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

      // No token: either fail fast (requireToken) or send without auth (often causes 401)
      if (!token) {
        if (requireToken) {
          return syntheticUnauthorized(
            url,
            'Authentication required (no token provided)',
          );
        }
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
    } catch (error) {
      // Token provider threw (e.g. refresh failed, storage error)
      if (requireToken) {
        const message =
          error instanceof Error
            ? error.message
            : 'Authentication failed (token provider error)';
        return syntheticUnauthorized(url, message);
      }
      // Legacy: proceed without auth, which usually results in a 401 from the server
      return next(request);
    }
  };
}

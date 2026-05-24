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
    error: {
      message,
      status: 401,
      statusText: 'Unauthorized',
      url,
    },
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

function pathnameForMatching(url: string): string {
  try {
    return new URL(url, 'http://fetch.local').pathname;
  } catch {
    return url;
  }
}

/**
 * Creates authentication header middleware.
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
    const pathname = pathnameForMatching(url);

    // Skip authentication if:
    // 1. URL matches a skip pattern
    // 2. URL doesn't match include patterns (if specified)
    if (
      shouldSkipAuth(pathname, skipPatterns) ||
      !shouldIncludeAuth(pathname, includePatterns)
    ) {
      return next(request);
    }

    let token: string;
    try {
      token = await tokenProvider();
    } catch (error) {
      if (requireToken) {
        const message =
          error instanceof Error
            ? error.message
            : 'Authentication failed (token provider error)';
        return syntheticUnauthorized(url, message);
      }
      return next(request);
    }

    if (!token) {
      if (requireToken) {
        return syntheticUnauthorized(
          url,
          'Authentication required (no token provided)',
        );
      }
      return next(request);
    }

    const headers = new Headers(request.headers);
    headers.set(headerName, `${tokenType} ${token}`);

    return next({
      ...request,
      headers,
    });
  };
}

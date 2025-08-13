/**
 * @fileoverview Authorization middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { AuthorizationOptions } from './types';

/**
 * Checks if a URL should skip authorization handling based on configured patterns.
 */
function shouldSkipAuth(
  url: string,
  skipPatterns: (RegExp | string)[] = [],
): boolean {
  // Extract pathname from URL for pattern matching
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = url; // fallback if not a valid URL
  }

  return skipPatterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return pathname.includes(pattern);
    }
    return pattern.test(pathname);
  });
}

/**
 * Creates authorization middleware with smart defaults.
 * Handles 401/403 responses by calling configured handlers.
 *
 * @param options - Authorization configuration options
 * @returns Authorization middleware for use with FetchClient
 *
 * @example Basic redirect on 401:
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   onUnauthorized: () => window.location.href = '/login'
 * });
 * ```
 *
 * @example Handle both 401 and 403:
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   onUnauthorized: () => redirectToLogin(),
 *   onForbidden: () => showAccessDeniedMessage(),
 *   statusCodes: [401, 403]
 * });
 * ```
 */
export function createAuthorizationMiddleware(
  options: AuthorizationOptions,
): FetchMiddleware {
  const {
    onUnauthorized,
    onForbidden,
    skipPatterns = [],
    statusCodes = [401],
  } = options;

  return async (request, next) => {
    const url = request.url || '';

    // Skip authorization handling if URL matches skip patterns
    if (shouldSkipAuth(url, skipPatterns)) {
      return next(request);
    }

    // Execute the request
    const response = await next(request);

    // Check if response status requires handling
    if (statusCodes.includes(response.status)) {
      try {
        if (response.status === 401 && onUnauthorized) {
          await onUnauthorized(response, request);
        } else if (response.status === 403 && onForbidden) {
          await onForbidden(response, request);
        } else if (onUnauthorized) {
          // For any other configured status codes, use the first available handler
          await onUnauthorized(response, request);
        }
      } catch (error) {
        // If handler fails, log but don't break the response chain
        // eslint-disable-next-line no-console
        console.warn('Authorization handler failed:', error);
      }
    }

    return response;
  };
}

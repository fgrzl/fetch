/**
 * @fileoverview Authorization response-handler middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { AuthorizationOptions } from './types';

function shouldSkipAuth(
  url: string,
  skipPatterns: (RegExp | string)[] = [],
): boolean {
  let pathname: string;
  try {
    pathname = new URL(url, 'http://fetch.local').pathname;
  } catch {
    pathname = url;
  }

  return skipPatterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return pathname.includes(pattern);
    }
    return pattern.test(pathname);
  });
}

/**
 * Creates middleware that invokes explicitly supplied handlers for
 * authorization responses.
 *
 * @param options - Handler and status configuration.
 * @returns Authorization middleware for use with `FetchClient`.
 *
 * @example
 * ```typescript
 * const middleware = createAuthorizationMiddleware({
 *   onUnauthorized: () => {
 *     window.location.assign('/login');
 *   }
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
    if (shouldSkipAuth(request.url || '', skipPatterns)) {
      return next(request);
    }

    const response = await next(request);

    if (!statusCodes.includes(response.status)) {
      return response;
    }

    try {
      if (response.status === 403 && onForbidden) {
        await onForbidden(response, request);
      } else if (onUnauthorized) {
        await onUnauthorized(response, request);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Authorization handler failed:', error);
    }

    return response;
  };
}

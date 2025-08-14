/**
 * @fileoverview Authorization middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type {
  AuthorizationOptions,
  RedirectAuthorizationConfig,
  UnauthorizedHandler,
} from './types';

/**
 * Creates a smart default redirect handler for unauthorized responses.
 * Redirects to login with a return URL parameter.
 */
function createRedirectHandler(config: RedirectAuthorizationConfig = {}) {
  const {
    redirectPath = '/login',
    returnUrlParam = 'return_url',
    includeReturnUrl = true,
  } = config;

  return () => {
    let redirectUrl = redirectPath;

    if (includeReturnUrl && typeof window !== 'undefined') {
      const currentUrl = encodeURIComponent(window.location.href);
      const separator = redirectPath.includes('?') ? '&' : '?';
      redirectUrl = `${redirectPath}${separator}${returnUrlParam}=${currentUrl}`;
    }

    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  };
}

/**
 * Selects the appropriate unauthorized handler based on provided options.
 * Priority: explicit onUnauthorized > redirectConfig > smart default
 */
function selectUnauthorizedHandler(
  providedHandler?: UnauthorizedHandler,
  redirectConfig?: RedirectAuthorizationConfig,
): UnauthorizedHandler {
  if (providedHandler) {
    return providedHandler;
  }

  return createRedirectHandler(redirectConfig);
}

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
 * @param options - Authorization configuration options (optional)
 * @returns Authorization middleware for use with FetchClient
 *
 * @example Smart defaults (no configuration needed):
 * ```typescript
 * const authzClient = useAuthorization(client);
 * // Redirects to '/login?return_url=current-page' on 401
 * ```
 *
 * @example Custom redirect configuration:
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   redirectConfig: {
 *     redirectPath: '/signin',
 *     returnUrlParam: 'redirect_to'
 *   }
 * });
 * ```
 *
 * @example Manual handler (full control):
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   onUnauthorized: () => window.location.href = '/login'
 * });
 * ```
 *
 * @example Handle both 401 and 403:
 * ```typescript
 * const authzClient = useAuthorization(client, {
 *   onForbidden: () => showAccessDeniedMessage(),
 *   statusCodes: [401, 403]
 * });
 * ```
 */
export function createAuthorizationMiddleware(
  options: AuthorizationOptions = {},
): FetchMiddleware {
  const {
    onUnauthorized: providedOnUnauthorized,
    redirectConfig,
    onForbidden,
    skipPatterns = [],
    statusCodes = [401],
  } = options;

  const onUnauthorized = selectUnauthorizedHandler(
    providedOnUnauthorized,
    redirectConfig,
  );

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

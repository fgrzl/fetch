/**
 * @fileoverview CSRF protection middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { CSRFOptions } from './types';

/**
 * Default CSRF token provider that extracts token from XSRF-TOKEN cookie.
 * This follows the standard convention used by Rails, Laravel, and many other frameworks.
 */
function getTokenFromCookie(cookieName: string = 'XSRF-TOKEN'): string {
  if (typeof document === 'undefined') {
    return ''; // Server-side, no cookies available
  }

  const name = `${cookieName}=`;
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');

  for (const cookie of cookies) {
    const c = cookie.trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length);
    }
  }

  return '';
}

/**
 * Checks if a URL should skip CSRF protection based on configured patterns.
 */
function shouldSkipCSRF(
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

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

/**
 * Creates CSRF protection middleware.
 * Automatically adds CSRF tokens to state-changing requests.
 *
 * @param options - CSRF configuration options
 * @returns CSRF middleware for use with FetchClient
 *
 * @example Basic usage (uses cookies automatically):
 * ```typescript
 * const client = new FetchClient();
 * const csrfClient = addCSRF(client);
 * ```
 *
 * @example Custom token provider:
 * ```typescript
 * const csrfClient = addCSRF(client, {
 *   tokenProvider: () => localStorage.getItem('csrf-token') || ''
 * });
 * ```
 *
 * @example Skip external APIs:
 * ```typescript
 * const csrfClient = addCSRF(client, {
 *   skipPatterns: [/^https:\/\/api\.external\.com\//, '/webhook/']
 * });
 * ```
 */
export function createCSRFMiddleware(
  options: CSRFOptions = {},
): FetchMiddleware {
  // Conventional cookie/header defaults.
  const {
    headerName = 'X-XSRF-TOKEN',
    cookieName = 'XSRF-TOKEN',
    protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
    skipPatterns = [],
    tokenProvider = () => getTokenFromCookie(cookieName),
  } = options;
  const normalizedHeaderName = headerName.toLowerCase();

  return async (request, next) => {
    const method = (request.method || 'GET').toUpperCase();
    const url = request.url || '';

    // Skip CSRF protection if:
    // 1. Method is not in protected methods list
    // 2. URL matches a skip pattern
    if (
      !protectedMethods.includes(method) ||
      shouldSkipCSRF(url, skipPatterns)
    ) {
      return next(request);
    }

    // Get CSRF token
    const token = tokenProvider();

    // Skip if no token available (let the server handle the error)
    if (!token) {
      return next(request);
    }

    // Add CSRF token to request headers
    const headers = headersToRecord(request.headers);
    headers[normalizedHeaderName] = token;

    // Create modified request with CSRF header
    const modifiedRequest = {
      ...request,
      headers,
    };

    return next(modifiedRequest);
  };
}

/**
 * @fileoverview Query parameter utilities for FetchClient
 *
 * Provides utilities for building URL query strings from JavaScript objects
 * with proper handling of arrays, undefined values, and URL encoding.
 */

/**
 * Query parameter value types that can be converted to URL parameters.
 * Arrays are handled specially with multiple parameter entries.
 */
export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | QueryValue[];

/**
 * Object representing query parameters for URL construction.
 */
export type QueryParams = Record<string, QueryValue>;

const hasOwn = (object: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(object, key);

/**
 * Builds a URL query string from a JavaScript object.
 *
 * Features:
 * - ✅ Proper URL encoding via native URLSearchParams
 * - ✅ Array handling with multiple parameter entries
 * - ✅ Undefined value filtering (excluded from output)
 * - ✅ Type coercion to strings for all values
 *
 * @param query - Object containing query parameters
 * @returns URL-encoded query string (without leading '?')
 *
 * @example Basic usage:
 * ```typescript
 * buildQueryParams({ name: 'John', age: 30 })
 * // → "name=John&age=30"
 * ```
 *
 * @example Array handling:
 * ```typescript
 * buildQueryParams({ tags: ['typescript', 'javascript'], active: true })
 * // → "tags=typescript&tags=javascript&active=true"
 * ```
 *
 * @example Undefined filtering:
 * ```typescript
 * buildQueryParams({ name: 'John', email: undefined, age: null })
 * // → "name=John&age=null" (undefined excluded, null converted to string)
 * ```
 *
 * @example Real-world API usage:
 * ```typescript
 * const filters = {
 *   status: ['active', 'pending'],
 *   limit: 50,
 *   offset: 0,
 *   search: searchTerm || undefined // Conditionally included
 * };
 *
 * const queryString = buildQueryParams(filters);
 * // → "status=active&status=pending&limit=50&offset=0"
 * // (search excluded if searchTerm is undefined)
 * ```
 */
export function buildQueryParams(query: QueryParams): string {
  const params = new URLSearchParams();

  for (const key in query) {
    if (!hasOwn(query, key)) {
      continue;
    }

    const value = query[key];
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined) {
          params.append(key, String(item));
        }
      }
    } else {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

/**
 * Appends query parameters to a URL, handling existing query strings properly.
 *
 * @param baseUrl - The base URL to append parameters to
 * @param query - Object containing query parameters
 * @returns Complete URL with query parameters appended
 *
 * @example Basic URL building:
 * ```typescript
 * appendQueryParams('/api/users', { limit: 10, active: true })
 * // → "/api/users?limit=10&active=true"
 * ```
 *
 * @example Existing query parameters:
 * ```typescript
 * appendQueryParams('/api/users?sort=name', { limit: 10 })
 * // → "/api/users?sort=name&limit=10"
 * ```
 *
 * @example Empty query object:
 * ```typescript
 * appendQueryParams('/api/users', {})
 * // → "/api/users" (no change)
 * ```
 */
export function appendQueryParams(baseUrl: string, query: QueryParams): string {
  const queryString = buildQueryParams(query);

  if (!queryString) {
    return baseUrl;
  }

  // Handle URLs with fragments (hash)
  const fragmentIndex = baseUrl.indexOf('#');
  if (fragmentIndex !== -1) {
    const urlPart = baseUrl.slice(0, fragmentIndex);
    const fragmentPart = baseUrl.slice(fragmentIndex);
    const separator = urlPart.indexOf('?') === -1 ? '?' : '&';
    return `${urlPart}${separator}${queryString}${fragmentPart}`;
  }

  const separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
  return `${baseUrl}${separator}${queryString}`;
}

/**
 * @fileoverview Type definitions for the HTTP client.
 *
 * This file contains core TypeScript interfaces and types for FetchClient.
 * Designed for discoverability and type safety.
 */

/**
 * Typed response wrapper with consistent shape.
 *
 * ✅ Always returns this shape (never throws)
 * ✅ Use `.ok` to check success
 * ✅ Use `.data` for parsed response
 * ✅ Use `.error` for failure details
 *
 * @template T - The expected type of the response data
 *
 * @example
 * ```typescript
 * const result = await client.get<User[]>('/api/users');
 * if (result.ok) {
 *   console.log(result.data); // Type is User[]
 * } else {
 *   console.error(result.error?.message); // Handle error
 * }
 * ```
 */
export interface FetchResponse<T> {
  /** The parsed response data (null if request failed) */
  data: T | null;
  /** HTTP status code (0 for network errors) */
  status: number;
  /** HTTP status text ('Network Error' for network failures) */
  statusText: string;
  /** Response headers */
  headers: Headers;
  /** The request URL */
  url: string;
  /** True if status 200-299, false otherwise */
  ok: boolean;
  /** Error details when ok is false */
  error?: {
    /** Human-readable error message */
    message: string;
    /** Raw error response body */
    body?: unknown;
  };
}

/**
 * Configuration options for FetchClient.
 *
 * Optimized for "pit of success" - good defaults, minimal required config.
 */
export interface FetchClientOptions {
  /**
   * Controls credential handling for requests.
   *
   * - 'same-origin' (default): Send cookies for same-origin requests
   * - 'include': Always send cookies
   * - 'omit': Never send cookies
   */
  credentials?: RequestCredentials;
}

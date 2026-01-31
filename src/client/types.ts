/**
 * @fileoverview Type definitions for the HTTP client.
 *
 * This file contains core TypeScript interfaces and types for FetchClient.
 * Designed for discoverability and type safety.
 */

// Export RequestOptions interface so it's available to consumers
export interface RequestOptions {
  /**
   * AbortSignal for cancelling the request.
   *
   * Use AbortController to cancel requests programmatically.
   *
   * @example
   * ```typescript
   * const controller = new AbortController();
   * const request = client.get('/api/slow', {}, { signal: controller.signal });
   *
   * // Cancel the request
   * controller.abort();
   * ```
   */
  signal?: AbortSignal;

  /**
   * Request timeout in milliseconds.
   *
   * Overrides the default timeout set in FetchClientOptions.
   * Set to 0 or undefined for no timeout.
   *
   * @example
   * ```typescript
   * // Override default timeout for this specific request
   * await client.get('/api/fast', {}, { timeout: 1000 });
   * ```
   */
  timeout?: number;
}

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

  /**
   * Base URL for relative requests.
   *
   * When set, all relative URLs (not starting with http:// or https://) will be
   * prefixed with this base URL. Absolute URLs are used as-is.
   *
   * @example
   * ```typescript
   * const client = new FetchClient({ baseUrl: 'https://api.example.com' });
   * await client.get('/users'); // → GET https://api.example.com/users
   * await client.get('https://other-api.com/data'); // → GET https://other-api.com/data
   * ```
   */
  baseUrl?: string;

  /**
   * Default timeout for requests in milliseconds.
   *
   * When set, requests will automatically be aborted after this duration.
   * Individual requests can override this by providing their own timeout or signal.
   * Set to 0 or undefined for no timeout.
   *
   * @example
   * ```typescript
   * const client = new FetchClient({ timeout: 5000 }); // 5 second timeout
   * await client.get('/api/users'); // Will timeout after 5 seconds
   * ```
   */
  timeout?: number;
}

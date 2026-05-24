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

  /**
   * Operation ID for request tracing and correlation.
   *
   * When provided, automatically sets the 'x-operation-id' header.
   * Useful for distributed tracing, logging, and request correlation.
   *
   * @example
   * ```typescript
   * // Track a specific operation across services
   * await client.get('/api/users', {}, { operationId: crypto.randomUUID() });
   * ```
   *
   * @example
   * ```typescript
   * // Use with request context
   * const operationId = request.headers['x-request-id'];
   * await client.post('/api/logs', data, {}, { operationId });
   * ```
   */
  operationId?: string;
}

/**
 * Structured failure details returned when a request does not complete
 * successfully. HTTP failures, aborts, network failures, parse failures, and
 * URL resolution failures all use this shape.
 *
 * @template E - Optional response error body type
 */
export interface FetchResponseError<E = unknown> {
  /** Human-readable error message */
  message: string;
  /** HTTP status code (0 for client-side failures) */
  status: number;
  /** HTTP status text or a short client-side failure category */
  statusText: string;
  /** The request URL, when known */
  url: string;
  /** Parsed error response body, when available */
  body?: E;
  /** Underlying exception for network, abort, parse, or URL failures */
  cause?: unknown;
}

/**
 * Fields shared by successful and failed responses.
 */
export interface FetchResponseBase {
  /** HTTP status code (0 for network errors) */
  status: number;
  /** HTTP status text or client-side failure category */
  statusText: string;
  /** Response headers */
  headers: Headers;
  /** The request URL */
  url: string;
}

/**
 * Successful response branch.
 *
 * @template T - The expected type of the response data
 */
export interface FetchSuccessResponse<T> extends FetchResponseBase {
  /** True if status 200-299, false otherwise */
  ok: true;
  /** Parsed response data */
  data: T;
  /** Success responses never have error details */
  error: null;
}

/**
 * Failed response branch.
 *
 * @template E - Optional response error body type
 */
export interface FetchFailureResponse<E = unknown> extends FetchResponseBase {
  /** False for HTTP errors, network failures, aborts, parse failures, and URL failures */
  ok: false;
  /** Failure responses never have successful data */
  data: null;
  /** Structured failure details */
  error: FetchResponseError<E>;
}

/**
 * Typed response wrapper with a discriminated shape.
 *
 * Use `.ok` to narrow the result:
 * - `ok: true` exposes `data: T` and `error: null`
 * - `ok: false` exposes `data: null` and `error: FetchResponseError<E>`
 *
 * @template T - The expected type of the response data
 * @template E - Optional type for parsed error response bodies
 */
export type FetchResponse<T, E = unknown> =
  | FetchSuccessResponse<T>
  | FetchFailureResponse<E>;

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

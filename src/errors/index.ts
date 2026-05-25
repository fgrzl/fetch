/**
 * @fileoverview Optional error helpers for exception-based control flow.
 *
 * Requests return `FetchResponse` objects by default. Use `throwOnError` when a
 * specific call site or integration needs exceptions.
 */

import type { FetchFailureResponse, FetchResponse } from '../client/types';

/**
 * Base error class for all fetch client errors.
 */
export class FetchError extends Error {
  /** Optional underlying cause */
  public readonly cause?: unknown;
  /** The request URL, when known */
  public readonly url: string | undefined;

  /**
   * Creates a new FetchError.
   * @param message - Error message
   * @param url - Request URL, when known
   * @param cause - Optional underlying cause
   */
  constructor(message: string, url?: string, cause?: unknown) {
    super(message);
    this.name = 'FetchError';
    if (url !== undefined) {
      this.url = url;
    }
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Error thrown by `throwOnError` when a response has a non-2xx status code.
 */
export class HttpError extends FetchError {
  /** The HTTP status code */
  public readonly status: number;
  /** The HTTP status text */
  public readonly statusText: string;
  /** The response body (if available) */
  public readonly body: unknown;

  /**
   * Creates a new HttpError.
   * @param status - HTTP status code
   * @param statusText - HTTP status text
   * @param body - Response body
   * @param url - The request URL
   * @param cause - Optional underlying cause
   */
  constructor(
    status: number,
    statusText: string,
    body: unknown,
    url: string,
    cause?: unknown,
  ) {
    super(`HTTP ${status} ${statusText} at ${url}`, url, cause);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Error thrown by `throwOnError` when a request fails before an HTTP response.
 */
export class NetworkError extends FetchError {
  /**
   * Creates a new NetworkError.
   * @param message - Error message
   * @param url - The request URL
   * @param cause - The underlying network error
   */
  constructor(message: string, url: string, cause?: unknown) {
    super(`Network error for ${url}: ${message}`, url, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Converts a failed response into the matching Error subtype.
 *
 * @param response - Failed fetch response
 * @returns A typed error matching the failure category.
 */
export function errorFromResponse<E = unknown>(
  response: FetchFailureResponse<E>,
): FetchError | HttpError | NetworkError {
  if (response.status === 0) {
    if (response.statusText === 'Network Error') {
      return new NetworkError(
        response.error.message,
        response.url,
        response.error.cause,
      );
    }

    return new FetchError(
      response.error.message,
      response.url,
      response.error.cause,
    );
  }

  if (response.status >= 200 && response.status < 300) {
    return new FetchError(
      response.error.message,
      response.url,
      response.error.cause,
    );
  }

  return new HttpError(
    response.status,
    response.statusText,
    response.error.body,
    response.url,
    response.error.cause,
  );
}

/**
 * Returns response data on success or throws an error on failure.
 *
 * @param response - Response returned by `FetchClient`
 * @returns Parsed response data
 * @throws HttpError for non-2xx HTTP failures, NetworkError for transport
 * failures, and FetchError for other client-side failures.
 */
export function throwOnError<T, E = unknown>(response: FetchResponse<T, E>): T {
  if (response.ok) {
    return response.data;
  }

  throw errorFromResponse(response);
}

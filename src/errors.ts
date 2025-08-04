/**
 * @fileoverview Custom error classes for the fetch client.
 */

/**
 * Base error class for all fetch client errors.
 */
export class FetchError extends Error {
  /** Optional underlying cause */
  public readonly cause?: Error;

  /**
   * Creates a new FetchError.
   * @param message - Error message
   * @param cause - Optional underlying cause
   */
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'FetchError';
    this.cause = cause;
  }
}

/**
 * Error thrown when an HTTP request fails with a non-2xx status code.
 */
export class HttpError extends FetchError {
  /** The HTTP status code */
  public readonly status: number;
  /** The HTTP status text */
  public readonly statusText: string;
  /** The response body (if available) */
  public readonly body: any;

  /**
   * Creates a new HttpError.
   * @param status - HTTP status code
   * @param statusText - HTTP status text
   * @param body - Response body
   * @param url - The request URL
   */
  constructor(status: number, statusText: string, body: any, url: string) {
    super(`HTTP ${status} ${statusText} at ${url}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

/**
 * Error thrown when a network request fails completely.
 */
export class NetworkError extends FetchError {
  /**
   * Creates a new NetworkError.
   * @param message - Error message
   * @param url - The request URL
   * @param cause - The underlying network error
   */
  constructor(message: string, url: string, cause?: Error) {
    super(`Network error for ${url}: ${message}`, cause);
    this.name = 'NetworkError';
  }
}

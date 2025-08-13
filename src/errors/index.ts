/**
 * @fileoverview Custom error classes - "Pit of Success" pattern.
 * 
 * 🎯 LEVEL 1: HttpError, NetworkError - Most common error types you'll catch
 * 🎯 LEVEL 2: FetchError - Base error class for advanced error handling
 * 
 * @example
 * ```typescript
 * try {
 *   await client.get('/api/data');
 * } catch (error) {
 *   if (error instanceof HttpError) {
 *     console.log(`HTTP ${error.status}: ${error.statusText}`);
 *   } else if (error instanceof NetworkError) {
 *     console.log('Network connection failed');
 *   }
 * }
 * ```
 */

// 🎯 LEVEL 2: Base error class (for advanced use cases)

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
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

// 🎯 LEVEL 1: Most commonly used error types

/**
 * Error thrown when an HTTP request fails with a non-2xx status code.
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
   */
  constructor(status: number, statusText: string, body: unknown, url: string) {
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

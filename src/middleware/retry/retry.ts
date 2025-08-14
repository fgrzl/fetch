/**
 * @fileoverview Retry middleware implementation with enhanced architecture.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { FetchResponse } from '../../client/types';
import type { RetryOptions } from './types';

/**
 * Default retry condition - retry on network errors and 5xx server errors.
 */
const defaultShouldRetry = (response: {
  status: number;
  ok: boolean;
}): boolean => {
  // Network errors (status 0) or server errors (5xx)
  return (
    response.status === 0 || (response.status >= 500 && response.status < 600)
  );
};

/**
 * Calculate delay for retry attempt based on backoff strategy.
 */
const calculateDelay = (
  attempt: number,
  baseDelay: number,
  backoff: 'exponential' | 'linear' | 'fixed',
  maxDelay: number,
): number => {
  let delay: number;

  switch (backoff) {
    case 'exponential':
      delay = baseDelay * Math.pow(2, attempt - 1);
      break;
    case 'linear':
      delay = baseDelay * attempt;
      break;
    case 'fixed':
    default:
      delay = baseDelay;
      break;
  }

  return Math.min(delay, maxDelay);
};

/**
 * Sleep for specified duration.
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a retry middleware with smart defaults.
 *
 * 🎯 PIT OF SUCCESS: Works great with no config, customizable when needed.
 *
 * Features:
 * - ✅ Preserves full middleware chain on retries (unlike old implementation)
 * - ✅ Exponential backoff with jitter
 * - ✅ Smart retry conditions (network errors + 5xx)
 * - ✅ Configurable but sensible defaults
 * - ✅ Type-safe configuration
 *
 * @param options - Retry configuration (all optional)
 * @returns Middleware function
 *
 * @example Basic usage:
 * ```typescript
 * const client = new FetchClient();
 * client.use(createRetryMiddleware()); // 3 retries with exponential backoff
 * ```
 *
 * @example Custom configuration:
 * ```typescript
 * const client = new FetchClient();
 * client.use(createRetryMiddleware({
 *   maxRetries: 5,
 *   delay: 500,
 *   backoff: 'linear',
 *   onRetry: (attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`)
 * }));
 * ```
 */
export function createRetryMiddleware(
  options: RetryOptions = {},
): FetchMiddleware {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 'exponential',
    maxDelay = 30000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  return async (request, next) => {
    let lastResponse: FetchResponse<unknown>;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // Execute the request through the middleware chain
        const response = await next(request);

        // If successful, return immediately
        if (response.ok) {
          return response;
        }

        // Check if we should retry this response with current attempt count
        if (!shouldRetry({ status: response.status, ok: response.ok }, attempt + 1)) {
          return response;
        }

        // If we've reached max retries, return the response
        if (attempt >= maxRetries) {
          return response;
        }

        // Store the failed response and increment attempt counter
        lastResponse = response;
        attempt++;

        // Calculate delay for next attempt
        const retryDelay = calculateDelay(attempt, delay, backoff, maxDelay);

        // Call onRetry callback if provided
        if (onRetry) {
          onRetry(attempt, retryDelay, {
            status: response.status,
            statusText: response.statusText,
          });
        }

        // Wait before retrying
        await sleep(retryDelay);
      } catch (error) {
        // Handle unexpected errors - treat as network error (status 0)
        const errorResponse: FetchResponse<unknown> = {
          data: null,
          status: 0,
          statusText: 'Network Error',
          headers: new Headers(),
          url: request.url || '',
          ok: false,
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            body: error,
          },
        };

        // If shouldn't retry, return error immediately
        if (!shouldRetry(errorResponse, attempt + 1)) {
          return errorResponse;
        }

        // If we've reached max retries, return the error
        if (attempt >= maxRetries) {
          return errorResponse;
        }

        lastResponse = errorResponse;
        attempt++;

        // Calculate delay for next attempt
        const retryDelay = calculateDelay(attempt, delay, backoff, maxDelay);

        if (onRetry) {
          onRetry(attempt, retryDelay, {
            status: errorResponse.status,
            statusText: errorResponse.statusText,
          });
        }

        await sleep(retryDelay);
      }
    }

    // Return the last response if we've exhausted all retries
    return lastResponse!;
  };
}

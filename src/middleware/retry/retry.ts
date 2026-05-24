/**
 * @fileoverview Retry middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { RetryOptions } from './types';

/**
 * Default retry condition - retry on network errors and 5xx server errors.
 */
const defaultShouldRetry = (response: {
  status: number;
  ok: boolean;
  statusText: string;
}): boolean => {
  // Retry transport failures, but respect caller-driven aborts.
  return (
    (response.status === 0 && response.statusText !== 'Request Aborted') ||
    (response.status >= 500 && response.status < 600)
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
 * Creates retry middleware with explicit configurable policy.
 *
 * Middleware registered after retry is invoked for every attempt. By default,
 * retries apply to network failures and `5xx` responses with exponential
 * backoff.
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
    let attempt = 0;

    while (true) {
      const response = await next(request);

      if (
        response.ok ||
        !shouldRetry(response, attempt + 1) ||
        attempt >= maxRetries
      ) {
        return response;
      }

      attempt++;
      const retryDelay = calculateDelay(attempt, delay, backoff, maxDelay);

      if (onRetry) {
        onRetry(attempt, retryDelay, {
          status: response.status,
          statusText: response.statusText,
        });
      }

      await sleep(retryDelay);
    }
  };
}

import type { ResponseMiddleware, FetchClient } from '../../client';
import type { RetryOptions } from './types';

/**
 * Default retry configuration.
 */
const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  delay: 1000,
  strategy: 'exponential',
  shouldRetry: (response: Response) => {
    // Retry on server errors (5xx) and rate limiting (429)
    return response.status >= 500 || response.status === 429;
  },
  onRetry: () => {
    // Default no-op
  },
};

/**
 * Calculates delay for retry attempt based on strategy.
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  strategy: 'fixed' | 'linear' | 'exponential',
): number {
  switch (strategy) {
    case 'fixed':
      return baseDelay;
    case 'linear':
      return baseDelay * attempt;
    case 'exponential':
      return baseDelay * Math.pow(2, attempt - 1);
    default:
      return baseDelay;
  }
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a response middleware that implements retry logic.
 *
 * Note: This implementation works as a response middleware but is limited
 * because Response objects are immutable and don't contain the original request.
 * For full retry capability, this would need to be implemented as a request
 * middleware or as part of the core fetch client logic.
 *
 * @param options - Retry configuration options
 * @returns Response middleware function
 *
 * @example
 * ```typescript
 * // Default retry (3 attempts, exponential backoff, retry 5xx/429)
 * const retryMiddleware = createRetryMiddleware();
 * client.useResponseMiddleware(retryMiddleware);
 *
 * // Custom retry configuration
 * const customRetry = createRetryMiddleware({
 *   maxRetries: 5,
 *   delay: 500,
 *   strategy: 'linear',
 *   shouldRetry: (res) => res.status >= 400,
 *   onRetry: (res, attempt) => console.log(`Retry ${attempt} for ${res.status}`)
 * });
 * ```
 */
export function createRetryMiddleware(
  options: RetryOptions = {},
): ResponseMiddleware {
  const config = { ...defaultRetryOptions, ...options };

  // Track retry attempts per request
  const retryAttempts = new WeakMap<Request, number>();

  return async (request: Request, response: Response): Promise<Response> => {
    // Check if this response should be retried
    if (response.ok || !config.shouldRetry(response, 0)) {
      // Clean up retry tracking for successful responses
      retryAttempts.delete(request);
      return response;
    }

    // Get current retry count for this request
    const currentAttempt = (retryAttempts.get(request) || 0) + 1;

    // Check if we've exceeded max retries
    if (currentAttempt > config.maxRetries) {
      retryAttempts.delete(request);
      return response;
    }

    // Update retry count
    retryAttempts.set(request, currentAttempt);

    // Call onRetry callback
    config.onRetry(response, currentAttempt);

    // Calculate delay
    const delay = calculateDelay(currentAttempt, config.delay, config.strategy);

    // Wait before retry
    if (delay > 0) {
      await sleep(delay);
    }

    // Clone the request for retry (needed because Request body can only be read once)
    const clonedRequest = request.clone();

    // Make the retry request with the original request configuration
    try {
      const retryResponse = await fetch(clonedRequest);

      // If retry succeeds, clean up retry tracking
      if (retryResponse.ok) {
        retryAttempts.delete(request);
      }

      return retryResponse;
    } catch {
      // If retry fails completely, clean up and return original response
      retryAttempts.delete(request);
      return response;
    }
  };
}

/**
 * Creates retry middleware with exponential backoff strategy.
 *
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns Response middleware with exponential backoff
 */
export function createExponentialRetry(
  maxRetries = 3,
  baseDelay = 1000,
): ResponseMiddleware {
  return createRetryMiddleware({
    maxRetries,
    delay: baseDelay,
    strategy: 'exponential',
  });
}

/**
 * Creates retry middleware for server errors only (5xx status codes).
 *
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Response middleware that retries server errors
 */
export function createServerErrorRetry(maxRetries = 3): ResponseMiddleware {
  return createRetryMiddleware({
    maxRetries,
    shouldRetry: (response) => response.status >= 500,
  });
}

/**
 * Configures automatic retry functionality for failed requests.
 *
 * This function adds middleware that will automatically retry failed requests
 * based on the configured retry strategy and conditions.
 *
 * @param client - The FetchClient instance to configure
 * @param config - Retry configuration options
 *
 * @example
 * ```typescript
 * // Use defaults (3 retries with exponential backoff)
 * const client = new FetchClient();
 * useRetry(client);
 *
 * // Custom configuration
 * useRetry(client, {
 *   maxRetries: 5,
 *   delay: 1000,
 *   strategy: 'linear'
 * });
 *
 * // Only retry server errors
 * useRetry(client, {
 *   shouldRetry: (response) => response.status >= 500
 * });
 * ```
 */
export function useRetry(client: FetchClient, config: RetryOptions = {}) {
  client.useResponseMiddleware(createRetryMiddleware(config));
}

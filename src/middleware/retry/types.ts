/**
 * @fileoverview Retry middleware types and configuration.
 */

/**
 * Retry configuration options - optimized for "pit of success".
 *
 * Smart defaults:
 * - 3 retries (4 total attempts)
 * - Exponential backoff starting at 1000ms
 * - Only retry on network errors and 5xx status codes
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   * Total attempts will be maxRetries + 1
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds (default: 1000)
   * Subsequent delays use exponential backoff
   */
  delay?: number;

  /**
   * Backoff strategy (default: 'exponential')
   * - 'exponential': delay * (2 ^ attempt)
   * - 'linear': delay * attempt
   * - 'fixed': always use delay
   */
  backoff?: 'exponential' | 'linear' | 'fixed';

  /**
   * Maximum delay cap in milliseconds (default: 30000 = 30s)
   * Prevents exponential backoff from getting too large
   */
  maxDelay?: number;

  /**
   * Custom function to determine if a response should be retried
   * Default: retry on network errors (status 0) and server errors (5xx)
   *
   * @param response - The fetch response or error
   * @param attempt - Current attempt number (1-based)
   * @returns true if request should be retried
   */
  shouldRetry?: (
    response: { status: number; ok: boolean },
    attempt: number,
  ) => boolean;

  /**
   * Optional callback called before each retry attempt
   * Useful for logging or analytics
   *
   * @param attempt - Current attempt number (1-based)
   * @param delay - Delay before this retry in ms
   * @param lastResponse - The failed response that triggered the retry
   */
  onRetry?: (
    attempt: number,
    delay: number,
    lastResponse: { status: number; statusText: string },
  ) => void;
}

// Ensure this file is treated as a module
export {};

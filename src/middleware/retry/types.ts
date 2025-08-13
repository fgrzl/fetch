/**
 * Configuration options for retry middleware.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  delay?: number;
  /** Retry strategy to use (default: 'exponential') */
  strategy?: 'fixed' | 'linear' | 'exponential';
  /** Function to determine if a response should be retried */
  shouldRetry?: (response: Response, attempt: number) => boolean;
  /** Function called before each retry attempt */
  onRetry?: (response: Response, attempt: number) => void;
}

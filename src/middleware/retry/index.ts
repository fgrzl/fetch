/**
 * Retry Middleware - "Pit of Success" pattern
 *
 * This middleware provides automatic retry functionality for failed requests with:
 * - Configurable retry strategies (fixed, linear, exponential backoff)
 * - Customizable retry conditions
 * - Request context preservation across retries
 *
 * @example
 * ```typescript
 * import { useRetry } from '@fgrzl/fetch';
 *
 * const client = new FetchClient();
 * useRetry(client); // Just works - 3 retries with exponential backoff!
 * ```
 */

// 🎯 LEVEL 1: Main function users need (simple, smart defaults)
export { useRetry } from './retry-middleware';

// 🎯 LEVEL 2: Configuration type for TypeScript users
export type { RetryOptions } from './types';

// 🎯 LEVEL 3: Factory functions for advanced use cases
export { 
  createRetryMiddleware,
  createExponentialRetry,
  createServerErrorRetry
} from './retry-middleware';

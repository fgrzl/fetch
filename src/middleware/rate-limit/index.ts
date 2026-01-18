/**
 * @fileoverview Rate limiting middleware - specialized use cases.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { RateLimitOptions } from './types';
import { createRateLimitMiddleware } from './rate-limit';

// Re-export types for convenience
export type { RateLimitOptions, RateLimitAlgorithm } from './types';
export { createRateLimitMiddleware } from './rate-limit';

/**
 * Rate limiting middleware - mainly for API quota management.
 * Note: This is primarily useful for specific scenarios like:
 * - Respecting third-party API limits
 * - Bulk operations that need throttling
 * - Pay-per-request API cost management
 */
export function addRateLimit(
  client: FetchClient,
  options: RateLimitOptions = {},
): FetchClient {
  return client.use(createRateLimitMiddleware(options));
}

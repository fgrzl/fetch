/**
 * @fileoverview Logging middleware - "pit of success" API.
 */

import type { FetchClient } from '../../client/fetch-client';
import type { LoggingOptions } from './types';
import { createLoggingMiddleware } from './logging';

// Re-export types for convenience
export type { LoggingOptions, Logger, LogEntry, LogLevel } from './types';
export { createLoggingMiddleware } from './logging';

/**
 * "Pit of success" API for adding logging to a FetchClient.
 * Logs HTTP requests and responses for debugging and monitoring.
 * 
 * @param client - The FetchClient to add logging to
 * @param options - Logging configuration options
 * @returns A new FetchClient with logging middleware
 * 
 * @example Basic logging to console:
 * ```typescript
 * const loggedClient = useLogging(client);
 * 
 * // Logs: → GET /api/users
 * // Logs: ← GET /api/users → 200 (245ms)
 * await loggedClient.get('/api/users');
 * ```
 * 
 * @example Custom log level and headers:
 * ```typescript
 * const loggedClient = useLogging(client, {
 *   level: 'debug',
 *   includeRequestHeaders: true,
 *   includeResponseHeaders: true
 * });
 * ```
 * 
 * @example Skip health check endpoints:
 * ```typescript
 * const loggedClient = useLogging(client, {
 *   skipPatterns: ['/health', '/metrics', '/ping']
 * });
 * ```
 */
export function useLogging(client: FetchClient, options: LoggingOptions = {}): FetchClient {
  return client.use(createLoggingMiddleware(options));
}

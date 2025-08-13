/**
 * @fileoverview Logging middleware types and configuration.
 */

/**
 * Log levels for filtering log output.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure.
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: Error;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
}

/**
 * Custom logger interface.
 */
export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

/**
 * Logging configuration options - optimized for "pit of success".
 *
 * Smart defaults:
 * - Logs to console
 * - Info level by default
 * - Excludes request/response bodies by default
 * - Includes timing information
 */
export interface LoggingOptions {
  /**
   * Minimum log level to output (default: 'info')
   * Logs at this level and above will be output
   */
  level?: LogLevel;

  /**
   * Custom logger implementation (default: console)
   * Can be replaced with winston, pino, etc.
   */
  logger?: Logger;

  /**
   * Include request headers in logs (default: false)
   * May contain sensitive information
   */
  includeRequestHeaders?: boolean;

  /**
   * Include response headers in logs (default: false)
   * May contain sensitive information
   */
  includeResponseHeaders?: boolean;

  /**
   * Include request body in logs (default: false)
   * May contain sensitive information and increase log size
   */
  includeRequestBody?: boolean;

  /**
   * Include response body in logs (default: false)
   * May contain sensitive information and increase log size
   */
  includeResponseBody?: boolean;

  /**
   * Skip logging for requests matching these URL patterns
   * Useful for health checks, metrics endpoints, etc.
   *
   * @example
   * ```typescript
   * skipPatterns: ['/health', '/metrics', /\/static\//]
   * ```
   */
  skipPatterns?: (RegExp | string)[];

  /**
   * Custom log formatter function
   * Allows complete customization of log output
   */
  formatter?: (entry: LogEntry) => string;
}

// Ensure this file is treated as a module
export {};

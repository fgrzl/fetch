/**
 * @fileoverview Logging middleware implementation.
 */

import type { FetchMiddleware } from '../../client/fetch-client';
import type { LoggingOptions, Logger, LogEntry, LogLevel } from './types';

/**
 * Default console logger implementation.
 */
const defaultLogger: Logger = {
  // eslint-disable-next-line no-console -- allow console.debug in logger implementation
  debug: (message: string, data?: unknown) => console.debug(message, data),
  // eslint-disable-next-line no-console -- allow console.info in logger implementation
  info: (message: string, data?: unknown) => console.info(message, data),
  // eslint-disable-next-line no-console -- allow console.warn in logger implementation
  warn: (message: string, data?: unknown) => console.warn(message, data),
  // eslint-disable-next-line no-console -- allow console.error in logger implementation
  error: (message: string, data?: unknown) => console.error(message, data),
};

/**
 * Log level priority for filtering.
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Default log formatter.
 */
const defaultFormatter = (entry: LogEntry): string => {
  const { method, url, status, duration } = entry;
  let message = `${method} ${url}`;

  if (status) {
    message += ` → ${status}`;
  }

  if (duration) {
    message += ` (${duration}ms)`;
  }

  return message;
};

/**
 * Checks if a URL should skip logging based on configured patterns.
 */
function shouldSkipLogging(
  url: string,
  skipPatterns: (RegExp | string)[] = [],
): boolean {
  return skipPatterns.some((pattern) => {
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return pattern.test(url);
  });
}

/**
 * Creates logging middleware with smart defaults.
 * Logs HTTP requests and responses for debugging and monitoring.
 *
 * @param options - Logging configuration options
 * @returns Logging middleware for use with FetchClient
 *
 * @example Basic logging:
 * ```typescript
 * const loggedClient = addLogging(client);
 * // Logs all requests to console
 * ```
 *
 * @example Custom logger:
 * ```typescript
 * const loggedClient = addLogging(client, {
 *   logger: winston.createLogger({...}),
 *   level: 'debug',
 *   includeRequestHeaders: true
 * });
 * ```
 */
export function createLoggingMiddleware(
  options: LoggingOptions = {},
): FetchMiddleware {
  const {
    level = 'info',
    logger = defaultLogger,
    includeRequestHeaders = false,
    includeResponseHeaders = false,
    includeRequestBody = false,
    includeResponseBody = false,
    skipPatterns = [],
    formatter = defaultFormatter,
  } = options;

  const minLevel = LOG_LEVELS[level];

  return async (request, next) => {
    const url = request.url || '';
    const method = (request.method || 'GET').toUpperCase();

    // Skip logging if URL matches skip patterns
    if (shouldSkipLogging(url, skipPatterns)) {
      return next(request);
    }

    const startTime = Date.now();

    // Log request start (debug level)
    if (LOG_LEVELS.debug >= minLevel) {
      const requestHeaders = includeRequestHeaders
        ? getHeadersObject(
            request.headers as Headers | Record<string, string> | undefined,
          )
        : undefined;
      const requestBody = includeRequestBody ? request.body : undefined;

      const requestEntry: LogEntry = {
        level: 'debug',
        timestamp: startTime,
        method,
        url,
        ...(requestHeaders && { requestHeaders }),
        ...(requestBody && { requestBody }),
      };

      logger.debug(`→ ${formatter(requestEntry)}`, requestEntry);
    }

    try {
      const response = await next(request);
      const duration = Date.now() - startTime;

      // Determine log level based on response status
      const logLevel: LogLevel = response.status >= 400 ? 'error' : 'info';

      // Log response (info/error level)
      if (LOG_LEVELS[logLevel] >= minLevel) {
        const responseHeaders = includeResponseHeaders
          ? getHeadersObject(response.headers)
          : undefined;
        const responseBody = includeResponseBody ? response.data : undefined;

        const responseEntry: LogEntry = {
          level: logLevel,
          timestamp: Date.now(),
          method,
          url,
          status: response.status,
          duration,
          ...(responseHeaders ? { responseHeaders } : {}),
          ...(responseBody !== undefined ? { responseBody } : {}),
        };

        const logMessage = `← ${formatter(responseEntry)}`;

        if (logLevel === 'error') {
          logger.error(logMessage, responseEntry);
        } else {
          logger.info(logMessage, responseEntry);
        }
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      if (LOG_LEVELS.error >= minLevel) {
        const errorEntry: LogEntry = {
          level: 'error',
          timestamp: Date.now(),
          method,
          url,
          duration,
          error: error instanceof Error ? error : new Error(String(error)),
        };

        logger.error(`✗ ${formatter(errorEntry)}`, errorEntry);
      }

      throw error;
    }
  };
}

/**
 * Convert Headers object to plain object.
 */
function getHeadersObject(
  headers: Headers | Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const obj: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  } else {
    // It's already a Record<string, string>
    return headers;
  }
}

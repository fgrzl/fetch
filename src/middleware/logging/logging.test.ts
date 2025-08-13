/**
 * @fileoverview Logging middleware tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../../client/fetch-client';
import { useLogging, createLoggingMiddleware } from './index';
import type { LoggingOptions, Logger } from './types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue(
    new Response('{"success": true}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
});

describe('Logging Middleware', () => {
  describe('useLogging (Pit of Success API)', () => {
    it('should log requests and responses to console by default', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const client = new FetchClient();
      const loggedClient = useLogging(client);

      await loggedClient.get('https://api.example.com/users');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('← GET https://api.example.com/users → 200'),
        expect.objectContaining({
          level: 'info',
          method: 'GET',
          url: 'https://api.example.com/users',
          status: 200,
          duration: expect.any(Number),
        }),
      );

      infoSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it('should log errors for 4xx/5xx responses', async () => {
      mockFetch.mockResolvedValue(
        new Response('Server Error', { status: 500 }),
      );

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const client = new FetchClient();
      const loggedClient = useLogging(client);

      await loggedClient.get('https://api.example.com/error');

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('← GET https://api.example.com/error → 500'),
        expect.objectContaining({
          level: 'error',
          method: 'GET',
          url: 'https://api.example.com/error',
          status: 500,
        }),
      );

      errorSpy.mockRestore();
    });

    it('should use custom logger', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
      });

      await loggedClient.post('https://api.example.com/data', { test: true });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('← POST https://api.example.com/data → 200'),
        expect.objectContaining({
          level: 'info',
          method: 'POST',
          url: 'https://api.example.com/data',
          status: 200,
        }),
      );
    });

    it('should respect log level filtering', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
        level: 'warn', // Only warn and error
      });

      await loggedClient.get('https://api.example.com/users');

      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log debug messages when level is debug', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
        level: 'debug',
      });

      await loggedClient.get('https://api.example.com/users');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('→ GET https://api.example.com/users'),
        expect.objectContaining({
          level: 'debug',
          method: 'GET',
          url: 'https://api.example.com/users',
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('← GET https://api.example.com/users → 200'),
        expect.objectContaining({
          level: 'info',
          status: 200,
        }),
      );
    });

    it('should skip logging for URLs matching skip patterns', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
        skipPatterns: ['/health', /\/metrics/],
      });

      await loggedClient.get('https://api.example.com/health');
      await loggedClient.get('https://api.example.com/metrics/cpu');
      await loggedClient.get('https://api.example.com/users');

      // Should only log the /users call
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.any(Object),
      );
    });

    it('should include request headers when configured', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
        level: 'debug',
        includeRequestHeaders: true,
      });

      const response = await loggedClient.request(
        'https://api.example.com/users',
        {
          method: 'GET',
          headers: { 'X-Custom': 'test-header' },
        },
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requestHeaders: expect.objectContaining({
            'X-Custom': 'test-header',
          }),
        }),
      );
    });

    it('should include response headers when configured', async () => {
      mockFetch.mockResolvedValue(
        new Response('{"data": true}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Response': 'custom-header',
          },
        }),
      );

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
        includeResponseHeaders: true,
      });

      await loggedClient.get('https://api.example.com/users');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseHeaders: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Response': 'custom-header',
          }),
        }),
      );
    });

    it('should include request and response bodies when configured', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
        level: 'debug',
        includeRequestBody: true,
        includeResponseBody: true,
      });

      await loggedClient.post('https://api.example.com/users', {
        name: 'John',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requestBody: expect.stringContaining('John'),
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          responseBody: { success: true },
        }),
      );
    });

    it('should use custom formatter', async () => {
      const customFormatter = vi.fn().mockReturnValue('CUSTOM LOG MESSAGE');
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
        formatter: customFormatter,
      });

      await loggedClient.get('https://api.example.com/users');

      expect(customFormatter).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://api.example.com/users',
          status: 200,
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('CUSTOM LOG MESSAGE'),
        expect.any(Object),
      );
    });

    it('should log network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
      });

      await expect(
        loggedClient.get('https://api.example.com/users'),
      ).rejects.toThrow('Network failure');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('✗ GET https://api.example.com/users'),
        expect.objectContaining({
          level: 'error',
          method: 'GET',
          url: 'https://api.example.com/users',
          error: expect.objectContaining({
            message: 'Network failure',
          }),
          duration: expect.any(Number),
        }),
      );
    });

    it('should measure request duration accurately', async () => {
      vi.useFakeTimers();

      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();
      const loggedClient = useLogging(client, {
        logger: mockLogger,
      });

      // Mock a delayed response
      const responsePromise = loggedClient.get('https://api.example.com/users');

      // Advance time by 100ms
      vi.advanceTimersByTime(100);

      await responsePromise;

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('(100ms)'),
        expect.objectContaining({
          duration: 100,
        }),
      );

      vi.useRealTimers();
    });
  });

  describe('createLoggingMiddleware (Direct API)', () => {
    it('should create middleware with custom options', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const middleware = createLoggingMiddleware({
        logger: mockLogger,
        level: 'warn',
      });

      const client = new FetchClient();
      const loggedClient = client.use(middleware);

      await loggedClient.get('https://api.example.com/test');

      // Should not log info level with warn threshold
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should work in middleware chain', async () => {
      const logger1: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const logger2: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const logging1 = createLoggingMiddleware({
        logger: logger1,
        formatter: () => 'Logger 1',
      });

      const logging2 = createLoggingMiddleware({
        logger: logger2,
        formatter: () => 'Logger 2',
      });

      const client = new FetchClient();
      const multiLogClient = client.use(logging1).use(logging2);

      await multiLogClient.get('https://api.example.com/test');

      expect(logger1.info).toHaveBeenCalledWith(
        expect.stringContaining('Logger 1'),
        expect.any(Object),
      );

      expect(logger2.info).toHaveBeenCalledWith(
        expect.stringContaining('Logger 2'),
        expect.any(Object),
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should work with authentication middleware', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const client = new FetchClient();

      const { useAuthentication } = await import('../authentication');

      const authLoggedClient = useAuthentication(client, {
        tokenProvider: () => 'test-token',
      }).use(
        createLoggingMiddleware({
          logger: mockLogger,
          includeRequestHeaders: true,
        }),
      );

      await authLoggedClient.get('https://api.example.com/secure');

      // Should log the request with auth headers
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('GET https://api.example.com/secure'),
        expect.objectContaining({
          responseHeaders: expect.any(Object),
        }),
      );
    });

    it('should handle errors from other middleware', async () => {
      const mockLogger: Logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const faultyMiddleware = vi
        .fn()
        .mockRejectedValue(new Error('Middleware error'));

      const client = new FetchClient();
      const loggedClient = client
        .use(faultyMiddleware)
        .use(createLoggingMiddleware({ logger: mockLogger }));

      await expect(
        loggedClient.get('https://api.example.com/test'),
      ).rejects.toThrow('Middleware error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('✗ GET https://api.example.com/test'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Middleware error',
          }),
        }),
      );
    });
  });

  describe('Log level priorities', () => {
    const levels = ['debug', 'info', 'warn', 'error'] as const;

    levels.forEach((minLevel, minIndex) => {
      it(`should only log ${minLevel} and above when level is ${minLevel}`, async () => {
        const mockLogger: Logger = {
          debug: vi.fn(),
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        };

        const client = new FetchClient();
        const loggedClient = useLogging(client, {
          logger: mockLogger,
          level: minLevel,
        });

        // Successful request (info level)
        await loggedClient.get('https://api.example.com/users');

        // Error request (error level)
        mockFetch.mockResolvedValueOnce(new Response('Error', { status: 500 }));
        await loggedClient.get('https://api.example.com/error');

        levels.forEach((level, index) => {
          if (index >= minIndex) {
            // Should be called for levels at or above threshold
            if (level === 'info' || level === 'error') {
              expect(mockLogger[level]).toHaveBeenCalled();
            }
          }
        });
      });
    });
  });
});

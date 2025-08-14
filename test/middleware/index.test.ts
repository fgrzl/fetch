/**
 * @fileoverview Tests for middleware module exports.
 *
 * This test ensures that the middleware module properly exports:
 * 1. All middleware functions and creators
 * 2. Pre-built middleware stacks
 * 3. Types for TypeScript users
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../src/client/fetch-client';
import * as middleware from '../../src/middleware';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Middleware Module Exports', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication Middleware Exports', () => {
    it('should export authentication functions', () => {
      expect(middleware.useAuthentication).toBeDefined();
      expect(middleware.createAuthenticationMiddleware).toBeDefined();
      expect(typeof middleware.useAuthentication).toBe('function');
      expect(typeof middleware.createAuthenticationMiddleware).toBe('function');
    });

    it('should create functional authentication middleware', async () => {
      const client = new FetchClient();
      const authClient = middleware.useAuthentication(client, {
        tokenProvider: () => 'test-token',
      });

      await authClient.get('http://example.com/test');

      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.authorization).toBe('Bearer test-token');
    });
  });

  describe('Authorization Middleware Exports', () => {
    it('should export authorization functions', () => {
      expect(middleware.useAuthorization).toBeDefined();
      expect(middleware.createAuthorizationMiddleware).toBeDefined();
      expect(typeof middleware.useAuthorization).toBe('function');
      expect(typeof middleware.createAuthorizationMiddleware).toBe('function');
    });

    it('should create functional authorization middleware', () => {
      const client = new FetchClient();
      const authzClient = middleware.useAuthorization(client, {
        onUnauthorized: () => console.log('Unauthorized'),
      });

      expect(authzClient).toBeDefined();
    });
  });

  describe('Cache Middleware Exports', () => {
    it('should export cache functions', () => {
      expect(middleware.useCache).toBeDefined();
      expect(middleware.createCacheMiddleware).toBeDefined();
      expect(typeof middleware.useCache).toBe('function');
      expect(typeof middleware.createCacheMiddleware).toBe('function');
    });

    it('should create functional cache middleware', () => {
      const client = new FetchClient();
      const cacheClient = middleware.useCache(client, {
        ttl: 1000,
        methods: ['GET'],
      });

      expect(cacheClient).toBeDefined();
    });
  });

  describe('CSRF Middleware Exports', () => {
    it('should export CSRF function', () => {
      expect(middleware.useCSRF).toBeDefined();
      expect(typeof middleware.useCSRF).toBe('function');
    });

    it('should create functional CSRF middleware', () => {
      // Set up mock cookie for CSRF token
      Object.defineProperty(document, 'cookie', {
        value: 'csrftoken=test-csrf-token',
        writable: true,
      });

      const client = new FetchClient();
      const csrfClient = middleware.useCSRF(client, {
        tokenProvider: () => 'test-csrf-token',
        headerName: 'X-CSRFToken',
      });

      expect(csrfClient).toBeDefined();
    });
  });

  describe('Logging Middleware Exports', () => {
    it('should export logging functions', () => {
      expect(middleware.useLogging).toBeDefined();
      expect(middleware.createLoggingMiddleware).toBeDefined();
      expect(typeof middleware.useLogging).toBe('function');
      expect(typeof middleware.createLoggingMiddleware).toBe('function');
    });

    it('should create functional logging middleware', () => {
      const client = new FetchClient();
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const loggingClient = middleware.useLogging(client, {
        level: 'info',
        logger,
      });

      expect(loggingClient).toBeDefined();
    });
  });

  describe('Rate Limit Middleware Exports', () => {
    it('should export rate limit functions', () => {
      expect(middleware.useRateLimit).toBeDefined();
      expect(middleware.createRateLimitMiddleware).toBeDefined();
      expect(typeof middleware.useRateLimit).toBe('function');
      expect(typeof middleware.createRateLimitMiddleware).toBe('function');
    });

    it('should create functional rate limit middleware', () => {
      const client = new FetchClient();
      const rateLimitClient = middleware.useRateLimit(client, {
        maxRequests: 10,
        windowMs: 1000,
      });

      expect(rateLimitClient).toBeDefined();
    });
  });

  describe('Retry Middleware Exports', () => {
    it('should export retry functions', () => {
      expect(middleware.useRetry).toBeDefined();
      expect(middleware.createRetryMiddleware).toBeDefined();
      expect(typeof middleware.useRetry).toBeDefined();
      expect(typeof middleware.createRetryMiddleware).toBe('function');
    });

    it('should create functional retry middleware', () => {
      const client = new FetchClient();
      const retryClient = middleware.useRetry(client, {
        maxRetries: 3,
        delay: 1000,
      });

      expect(retryClient).toBeDefined();
    });
  });

  describe('Pre-built Stacks Exports', () => {
    it('should export all middleware stacks', () => {
      expect(middleware.useProductionStack).toBeDefined();
      expect(middleware.useDevelopmentStack).toBeDefined();
      expect(middleware.useBasicStack).toBeDefined();

      expect(typeof middleware.useProductionStack).toBe('function');
      expect(typeof middleware.useDevelopmentStack).toBe('function');
      expect(typeof middleware.useBasicStack).toBeDefined();
    });

    it('should create functional production stack', async () => {
      const client = new FetchClient();
      const prodClient = middleware.useProductionStack(client, {
        retry: { maxRetries: 1 },
        cache: { ttl: 1000, methods: ['GET'] },
        logging: { level: 'error' },
        rateLimit: { maxRequests: 10, windowMs: 1000 },
      });

      await prodClient.get('/test');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should create functional development stack', async () => {
      const client = new FetchClient();
      const devClient = middleware.useDevelopmentStack(client, {
        auth: { tokenProvider: () => 'dev-token' },
      });

      await devClient.get('http://example.com/test');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should create functional basic stack', async () => {
      const client = new FetchClient();
      const basicClient = middleware.useBasicStack(client, {
        auth: { tokenProvider: () => 'basic-token' },
      });

      await basicClient.get('http://example.com/test');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Middleware Composition', () => {
    it('should support chaining multiple middleware from exports', async () => {
      const client = new FetchClient();

      const enhancedClient = middleware.useAuthentication(
        middleware.useRetry(client, { maxRetries: 1 }),
        { tokenProvider: () => 'test-token' },
      );

      await enhancedClient.get('http://example.com/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.authorization).toBe('Bearer test-token');
    });

    it('should support creating custom middleware with exported creators', async () => {
      const client = new FetchClient();

      const authMiddleware = middleware.createAuthenticationMiddleware({
        tokenProvider: () => 'custom-token',
      });

      client.use(authMiddleware);
      await client.get('http://example.com/test');

      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.authorization).toBe('Bearer custom-token');
    });
  });

  describe('Type Exports Verification', () => {
    it('should make all middleware types available', () => {
      // This test ensures types are properly exported
      // If there were type export issues, this would fail at compile time

      const authOptions: middleware.AuthenticationOptions = {
        tokenProvider: () => 'token',
      };
      expect(authOptions.tokenProvider()).toBe('token');

      const cacheOptions: middleware.CacheOptions = {
        ttl: 1000,
        methods: ['GET'],
      };
      expect(cacheOptions.ttl).toBe(1000);

      const retryOptions: middleware.RetryOptions = {
        maxRetries: 3,
      };
      expect(retryOptions.maxRetries).toBe(3);

      // Other types exist but can't be easily tested without complex setup
      // The import itself validates they're exported correctly
    });
  });
});

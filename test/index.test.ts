/**
 * @fileoverview Tests for main library entry points and exports.
 *
 * This test file ensures that:
 * 1. Main exports are available and functional
 * 2. Default client works out of the box
 * 3. Re-exported types and functions are accessible
 * 4. "Pit of success" architecture is maintained
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fetchLib from '../src/index';
import api from '../src/index';

// Mock fetch for all tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Main Library Exports', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Test' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Export (Pre-configured Client)', () => {
    it('should export a pre-configured client as default', () => {
      expect(api).toBeDefined();
      expect(typeof api.get).toBe('function');
      expect(typeof api.post).toBe('function');
      expect(typeof api.put).toBe('function');
      expect(typeof api.del).toBe('function');
    });

    it('should work out of the box for GET requests', async () => {
      const response = await api.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should work out of the box for POST requests', async () => {
      const postData = { name: 'New Item' };
      const response = await api.post('/api/test', postData);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(response.data).toEqual({ id: 1, name: 'Test' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/test');
      expect(options?.method).toBe('POST');
      expect(JSON.parse(options?.body)).toEqual(postData);
    });

    it('should handle query parameters correctly', async () => {
      await api.get('/api/test', { status: 'active', limit: 10 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('/api/test?status=active&limit=10');
    });

    it('should include same-origin credentials by default', async () => {
      await api.get('http://example.com/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      expect(options?.credentials).toBe('same-origin');
    });
  });

  describe('Named Exports - Level 2 (FetchClient)', () => {
    it('should export FetchClient class', () => {
      expect(fetchLib.FetchClient).toBeDefined();
      expect(typeof fetchLib.FetchClient).toBe('function');

      const client = new fetchLib.FetchClient();
      expect(client).toBeDefined();
      expect(typeof client.get).toBe('function');
    });

    it('should export error classes', () => {
      expect(fetchLib.FetchError).toBeDefined();
      expect(fetchLib.HttpError).toBeDefined();
      expect(fetchLib.NetworkError).toBeDefined();

      expect(typeof fetchLib.FetchError).toBe('function');
      expect(typeof fetchLib.HttpError).toBe('function');
      expect(typeof fetchLib.NetworkError).toBeDefined();
    });
  });

  describe('Named Exports - Level 3 (Individual Middleware)', () => {
    it('should export authentication middleware', () => {
      expect(fetchLib.useAuthentication).toBeDefined();
      expect(fetchLib.createAuthenticationMiddleware).toBeDefined();
      expect(typeof fetchLib.useAuthentication).toBe('function');
      expect(typeof fetchLib.createAuthenticationMiddleware).toBe('function');
    });

    it('should export authorization middleware', () => {
      expect(fetchLib.useAuthorization).toBeDefined();
      expect(fetchLib.createAuthorizationMiddleware).toBeDefined();
      expect(typeof fetchLib.useAuthorization).toBe('function');
      expect(typeof fetchLib.createAuthorizationMiddleware).toBe('function');
    });

    it('should export cache middleware', () => {
      expect(fetchLib.useCache).toBeDefined();
      expect(fetchLib.createCacheMiddleware).toBeDefined();
      expect(typeof fetchLib.useCache).toBe('function');
      expect(typeof fetchLib.createCacheMiddleware).toBe('function');
    });

    it('should export CSRF middleware', () => {
      expect(fetchLib.useCSRF).toBeDefined();
      expect(typeof fetchLib.useCSRF).toBe('function');
    });

    it('should export logging middleware', () => {
      expect(fetchLib.useLogging).toBeDefined();
      expect(fetchLib.createLoggingMiddleware).toBeDefined();
      expect(typeof fetchLib.useLogging).toBe('function');
      expect(typeof fetchLib.createLoggingMiddleware).toBe('function');
    });

    it('should export rate limit middleware', () => {
      expect(fetchLib.useRateLimit).toBeDefined();
      expect(fetchLib.createRateLimitMiddleware).toBeDefined();
      expect(typeof fetchLib.useRateLimit).toBe('function');
      expect(typeof fetchLib.createRateLimitMiddleware).toBe('function');
    });

    it('should export retry middleware', () => {
      expect(fetchLib.useRetry).toBeDefined();
      expect(fetchLib.createRetryMiddleware).toBeDefined();
      expect(typeof fetchLib.useRetry).toBe('function');
      expect(typeof fetchLib.createRetryMiddleware).toBe('function');
    });
  });

  describe('Named Exports - Level 4 (Pre-built Stacks)', () => {
    it('should export middleware stacks', () => {
      expect(fetchLib.useProductionStack).toBeDefined();
      expect(fetchLib.useDevelopmentStack).toBeDefined();
      expect(fetchLib.useBasicStack).toBeDefined();

      expect(typeof fetchLib.useProductionStack).toBe('function');
      expect(typeof fetchLib.useDevelopmentStack).toBe('function');
      expect(typeof fetchLib.useBasicStack).toBeDefined();
    });

    it('should export query utilities', () => {
      expect(fetchLib.buildQueryParams).toBeDefined();
      expect(fetchLib.appendQueryParams).toBeDefined();

      expect(typeof fetchLib.buildQueryParams).toBe('function');
      expect(typeof fetchLib.appendQueryParams).toBe('function');
    });
  });

  describe('Middleware Functions Integration', () => {
    it('should be able to create authenticated client from exports', async () => {
      const client = new fetchLib.FetchClient();
      const authClient = fetchLib.useAuthentication(client, {
        tokenProvider: () => 'test-token',
      });

      await authClient.get('http://example.com/api/protected');

      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.authorization).toBe('Bearer test-token');
    });

    it('should be able to create client with multiple middleware', async () => {
      const client = new fetchLib.FetchClient();
      const enhancedClient = fetchLib.useAuthentication(client, {
        tokenProvider: () => 'test-token',
      });

      const finalClient = fetchLib.useLogging(enhancedClient, {
        level: 'info',
        logger: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
      });

      await finalClient.get('http://example.com/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.authorization).toBe('Bearer test-token');
    });

    it('should be able to use production stack', async () => {
      const client = new fetchLib.FetchClient();
      const prodClient = fetchLib.useProductionStack(client, {
        retry: { maxRetries: 1 },
        cache: { ttl: 1000, methods: ['GET'] },
        logging: { level: 'error' },
        rateLimit: { maxRequests: 10, windowMs: 1000 },
      });

      await prodClient.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type Exports Accessibility', () => {
    it('should make types available for TypeScript users', () => {
      // We can't directly test types, but we can ensure they're exported
      // by checking if they exist in the module
      const exportedNames = Object.keys(fetchLib);

      // Check that middleware function exports exist (types are co-located)
      expect(exportedNames).toContain('useAuthentication');
      expect(exportedNames).toContain('useAuthorization');
      expect(exportedNames).toContain('useCache');
      expect(exportedNames).toContain('useCSRF');
      expect(exportedNames).toContain('useLogging');
      expect(exportedNames).toContain('useRateLimit');
      expect(exportedNames).toContain('useRetry');
    });
  });
});

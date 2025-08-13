/**
 * @fileoverview CSRF middleware tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../../client/fetch-client';
import { useCSRF, createCSRFMiddleware } from './index';

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

  // Reset document mock
  Object.defineProperty(global, 'document', {
    value: {
      cookie: 'XSRF-TOKEN=default-csrf-token-123; other=value',
    } as any,
    writable: true,
  });
});

describe('CSRF Middleware', () => {
  describe('useCSRF (Pit of Success API)', () => {
    it('should add CSRF token to POST requests from cookies', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.post('https://api.example.com/users', { name: 'John' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'default-csrf-token-123',
          }),
        }),
      );
    });

    it('should add CSRF token to PUT requests', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.put('https://api.example.com/users/123', {
        name: 'Jane',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'default-csrf-token-123',
          }),
        }),
      );
    });

    it('should add CSRF token to PATCH requests', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.patch('https://api.example.com/users/123', {
        name: 'Bob',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'default-csrf-token-123',
          }),
        }),
      );
    });

    it('should add CSRF token to DELETE requests', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.del('https://api.example.com/users/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'default-csrf-token-123',
          }),
        }),
      );
    });

    it('should NOT add CSRF token to GET requests', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.get('https://api.example.com/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.not.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': expect.any(String),
          }),
        }),
      );
    });

    it('should use custom token provider', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client, {
        tokenProvider: () => 'custom-token-456',
      });

      await csrfClient.post('https://api.example.com/data', { test: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'custom-token-456',
          }),
        }),
      );
    });

    it('should use custom header and cookie names', async () => {
      (global as any).document = {
        cookie: '_token=laravel-csrf-token; other=value',
      };

      const client = new FetchClient();
      const csrfClient = useCSRF(client, {
        headerName: 'X-CSRF-Token',
        cookieName: '_token',
      });

      await csrfClient.post('https://api.example.com/data', { test: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'laravel-csrf-token',
          }),
        }),
      );
    });

    it('should skip CSRF for URLs matching skip patterns', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client, {
        skipPatterns: ['/webhook/', /^https:\/\/external\.api/],
      });

      await csrfClient.post('https://api.example.com/webhook/github', {
        event: 'push',
      });
      await csrfClient.post('https://external.api.com/data', { test: true });
      await csrfClient.post('https://api.example.com/internal', {
        data: 'sensitive',
      });

      const calls = mockFetch.mock.calls;

      // Webhook endpoint - no CSRF
      expect(calls[0][1]).not.toMatchObject({
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': expect.any(String),
        }),
      });

      // External API - no CSRF
      expect(calls[1][1]).not.toMatchObject({
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': expect.any(String),
        }),
      });

      // Internal endpoint - has CSRF
      expect(calls[2][1]).toMatchObject({
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': 'default-csrf-token-123',
        }),
      });
    });

    it('should skip CSRF when no token is available', async () => {
      (global as any).document = { cookie: 'other=value' }; // No CSRF token

      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.post('https://api.example.com/data', { test: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.not.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': expect.any(String),
          }),
        }),
      );
    });

    it('should work with custom protected methods', async () => {
      const client = new FetchClient();
      const csrfClient = useCSRF(client, {
        protectedMethods: ['POST'], // Only POST, not PUT/PATCH/DELETE
      });

      await csrfClient.post('https://api.example.com/data', { test: true });
      await csrfClient.put('https://api.example.com/data', { test: true });

      const calls = mockFetch.mock.calls;

      // POST - has CSRF
      expect(calls[0][1]).toMatchObject({
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': 'default-csrf-token-123',
        }),
      });

      // PUT - no CSRF (not in protected methods)
      expect(calls[1][1]).not.toMatchObject({
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': expect.any(String),
        }),
      });
    });

    it('should handle server-side rendering (no document)', async () => {
      // @ts-expect-error - Simulating server-side environment
      global.document = undefined;

      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.post('https://api.example.com/data', { test: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.not.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': expect.any(String),
          }),
        }),
      );
    });
  });

  describe('createCSRFMiddleware (Direct API)', () => {
    it('should create middleware with custom options', async () => {
      const middleware = createCSRFMiddleware({
        tokenProvider: () => 'direct-csrf-token',
        headerName: 'X-Custom-CSRF',
        protectedMethods: ['POST', 'PUT'],
      });

      const client = new FetchClient();
      const csrfClient = client.use(middleware);

      await csrfClient.post('https://api.example.com/test', { data: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-CSRF': 'direct-csrf-token',
          }),
        }),
      );
    });

    it('should work with multiple CSRF middleware (different endpoints)', async () => {
      const internalCSRF = createCSRFMiddleware({
        tokenProvider: () => 'internal-token',
        headerName: 'X-Internal-CSRF',
        skipPatterns: [/^https:\/\/external/],
      });

      const externalCSRF = createCSRFMiddleware({
        tokenProvider: () => 'external-token',
        headerName: 'X-External-CSRF',
        skipPatterns: [/^https:\/\/api\.internal/],
      });

      const client = new FetchClient();
      const multiCSRFClient = client.use(internalCSRF).use(externalCSRF);

      await multiCSRFClient.post('https://api.internal.com/data', {
        test: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.internal.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Internal-CSRF': 'internal-token',
            // External CSRF should be skipped due to pattern
          }),
        }),
      );
    });
  });

  describe('Cookie parsing', () => {
    it('should parse CSRF token from various cookie formats', async () => {
      const testCases = [
        'XSRF-TOKEN=token123',
        'other=value; XSRF-TOKEN=token456; more=data',
        'XSRF-TOKEN=token789; other=value',
        '  XSRF-TOKEN=token000  ; other=value',
      ];

      const client = new FetchClient();

      for (let i = 0; i < testCases.length; i++) {
        (global as any).document = { cookie: testCases[i] };
        const csrfClient = useCSRF(client);

        mockFetch.mockClear();
        await csrfClient.post('https://api.example.com/test', {});

        const expectedToken = testCases[i]
          .match(/XSRF-TOKEN=([^;]+)/)?.[1]
          ?.trim();
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-XSRF-TOKEN': expectedToken,
            }),
          }),
        );
      }
    });

    it('should handle URL encoded cookie values', async () => {
      (global as any).document = {
        cookie: 'XSRF-TOKEN=token%2Bwith%2Bplus; other=value',
      };

      const client = new FetchClient();
      const csrfClient = useCSRF(client);

      await csrfClient.post('https://api.example.com/test', {});

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'token+with+plus',
          }),
        }),
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should work with authentication middleware', async () => {
      const client = new FetchClient();

      // Import authentication here to avoid circular dependencies in real scenarios
      const { useAuthentication } = await import('../authentication');

      const protectedClient = useAuthentication(client, {
        tokenProvider: () => 'bearer-token',
      }).use(
        createCSRFMiddleware({
          tokenProvider: () => 'csrf-token',
        }),
      );

      await protectedClient.post('https://api.example.com/secure', {
        data: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/secure',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer bearer-token',
            'X-XSRF-TOKEN': 'csrf-token',
          }),
        }),
      );
    });
  });
});

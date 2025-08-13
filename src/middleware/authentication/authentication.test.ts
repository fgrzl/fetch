/**
 * @fileoverview Authentication middleware tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../../client/fetch-client';
import { useAuthentication, createAuthenticationMiddleware } from './index';
import type { AuthenticationOptions } from './types';

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

describe('Authentication Middleware', () => {
  describe('useAuthentication (Pit of Success API)', () => {
    it('should add Bearer token to requests', async () => {
      const client = new FetchClient();
      const authClient = useAuthentication(client, {
        tokenProvider: () => 'test-token-123',
      });

      await authClient.get('https://api.example.com/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        }),
      );
    });

    it('should handle async token provider', async () => {
      const client = new FetchClient();
      const authClient = useAuthentication(client, {
        tokenProvider: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'async-token-456';
        },
      });

      await authClient.post('https://api.example.com/data', { test: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer async-token-456',
          }),
        }),
      );
    });

    it('should skip requests when token is empty', async () => {
      const client = new FetchClient();
      const authClient = useAuthentication(client, {
        tokenProvider: () => '',
      });

      await authClient.get('https://api.example.com/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.not.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });

    it('should respect skip patterns', async () => {
      const client = new FetchClient();
      const authClient = useAuthentication(client, {
        tokenProvider: () => 'test-token',
        skipPatterns: ['/public', /^\/health/],
      });

      await authClient.get('https://api.example.com/public/data');
      await authClient.get('https://api.example.com/health/check');
      await authClient.get('https://api.example.com/private/data');

      const calls = mockFetch.mock.calls;

      // Public endpoint - no auth
      expect(calls[0][1]).not.toMatchObject({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      });

      // Health endpoint - no auth
      expect(calls[1][1]).not.toMatchObject({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      });

      // Private endpoint - has auth
      expect(calls[2][1]).toMatchObject({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      });
    });

    it('should respect include patterns', async () => {
      const client = new FetchClient();
      const authClient = useAuthentication(client, {
        tokenProvider: () => 'test-token',
        includePatterns: ['/api/', /^\/secure/],
      });

      await authClient.get('https://api.example.com/api/users');
      await authClient.get('https://api.example.com/secure/data');
      await authClient.get('https://api.example.com/public/data');

      const calls = mockFetch.mock.calls;

      // API endpoint - has auth
      expect(calls[0][1]).toMatchObject({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      });

      // Secure endpoint - has auth
      expect(calls[1][1]).toMatchObject({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      });

      // Public endpoint - no auth (not in include patterns)
      expect(calls[2][1]).not.toMatchObject({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      });
    });

    it('should use custom header name and token type', async () => {
      const client = new FetchClient();
      const authClient = useAuthentication(client, {
        tokenProvider: () => 'api-key-789',
        headerName: 'X-API-Key',
        tokenType: 'ApiKey',
      });

      await authClient.get('https://api.example.com/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'ApiKey api-key-789',
          }),
        }),
      );
    });

    it('should handle token provider errors gracefully', async () => {
      const client = new FetchClient();
      const authClient = useAuthentication(client, {
        tokenProvider: () => {
          throw new Error('Token fetch failed');
        },
      });

      // Should not throw, just proceed without auth
      await expect(
        authClient.get('https://api.example.com/users'),
      ).resolves.toBeDefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.not.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });
  });

  describe('createAuthenticationMiddleware (Direct API)', () => {
    it('should create middleware with custom options', async () => {
      const client = new FetchClient();
      const middleware = createAuthenticationMiddleware({
        tokenProvider: () => 'direct-token',
        headerName: 'Authorization',
        tokenType: 'Custom',
      });

      const authClient = client.use(middleware);
      await authClient.get('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Custom direct-token',
          }),
        }),
      );
    });

    it('should work with multiple middleware', async () => {
      const client = new FetchClient();

      const auth1 = createAuthenticationMiddleware({
        tokenProvider: () => 'token1',
        headerName: 'X-Auth-1',
        tokenType: 'Bearer',
      });

      const auth2 = createAuthenticationMiddleware({
        tokenProvider: () => 'token2',
        headerName: 'X-Auth-2',
        tokenType: 'Bearer',
      });

      const multiAuthClient = client.use(auth1).use(auth2);
      await multiAuthClient.get('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-1': 'Bearer token1',
            'X-Auth-2': 'Bearer token2',
          }),
        }),
      );
    });
  });
});

/**
 * @fileoverview Authorization middleware tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchClient } from '../../client/fetch-client';
import { useAuthorization, createAuthorizationMiddleware } from './index';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
});

describe('Authorization Middleware', () => {
  describe('useAuthorization (Pit of Success API)', () => {
    it('should call onUnauthorized for 401 responses', async () => {
      const onUnauthorized = vi.fn();
      mockFetch.mockResolvedValue(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, { onUnauthorized });

      const response = await authzClient.get('https://api.example.com/secure');

      expect(response.status).toBe(401);
      expect(onUnauthorized).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401 }),
        expect.objectContaining({ url: 'https://api.example.com/secure' }),
      );
    });

    it('should call onForbidden for 403 responses when configured', async () => {
      const onUnauthorized = vi.fn();
      const onForbidden = vi.fn();
      mockFetch.mockResolvedValue(
        new Response('Forbidden', {
          status: 403,
          statusText: 'Forbidden',
        }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, {
        onUnauthorized,
        onForbidden,
        statusCodes: [401, 403],
      });

      await authzClient.get('https://api.example.com/admin');

      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(onForbidden).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403 }),
        expect.objectContaining({ url: 'https://api.example.com/admin' }),
      );
    });

    it('should not call handlers for successful responses', async () => {
      const onUnauthorized = vi.fn();
      const onForbidden = vi.fn();
      mockFetch.mockResolvedValue(
        new Response('{"success": true}', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, {
        onUnauthorized,
        onForbidden,
        statusCodes: [401, 403],
      });

      await authzClient.get('https://api.example.com/data');

      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(onForbidden).not.toHaveBeenCalled();
    });

    it('should skip handler for URLs matching skip patterns', async () => {
      const onUnauthorized = vi.fn();
      mockFetch.mockResolvedValue(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, {
        onUnauthorized,
        skipPatterns: ['/login', /^\/auth/],
      });

      await authzClient.post('https://api.example.com/login', {});
      await authzClient.post('https://api.example.com/auth/register', {});
      await authzClient.get('https://api.example.com/secure');

      // Should not call handler for login/auth endpoints
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).toHaveBeenCalledWith(
        expect.objectContaining({ status: 401 }),
        expect.objectContaining({ url: 'https://api.example.com/secure' }),
      );
    });

    it('should handle async unauthorized handler', async () => {
      const onUnauthorized = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      mockFetch.mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, { onUnauthorized });

      await authzClient.get('https://api.example.com/secure');

      expect(onUnauthorized).toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      const onUnauthorized = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockFetch.mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, { onUnauthorized });

      const response = await authzClient.get('https://api.example.com/secure');

      expect(response.status).toBe(401);
      expect(onUnauthorized).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Authorization handler failed:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should only handle configured status codes', async () => {
      const onUnauthorized = vi.fn();

      // Test with 403 but only 401 configured
      mockFetch.mockResolvedValue(new Response('Forbidden', { status: 403 }));

      const client = new FetchClient();
      const authzClient = useAuthorization(client, {
        onUnauthorized,
        statusCodes: [401], // Only 401, not 403
      });

      await authzClient.get('https://api.example.com/admin');

      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });

  describe('createAuthorizationMiddleware (Direct API)', () => {
    it('should create middleware with custom status codes', async () => {
      const onUnauthorized = vi.fn();
      const onForbidden = vi.fn();

      mockFetch.mockResolvedValue(
        new Response('Payment Required', { status: 402 }),
      );

      const middleware = createAuthorizationMiddleware({
        onUnauthorized,
        onForbidden,
        statusCodes: [402], // Custom status code
      });

      const client = new FetchClient();
      const authzClient = client.use(middleware);

      await authzClient.get('https://api.example.com/premium');

      // Should call onUnauthorized for 402 since it's the first handler
      expect(onUnauthorized).toHaveBeenCalledWith(
        expect.objectContaining({ status: 402 }),
        expect.objectContaining({ url: 'https://api.example.com/premium' }),
      );
    });

    it('should work in middleware chain', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      mockFetch.mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const auth1 = createAuthorizationMiddleware({
        onUnauthorized: handler1,
      });

      const auth2 = createAuthorizationMiddleware({
        onUnauthorized: handler2,
      });

      const client = new FetchClient();
      const authzClient = client.use(auth1).use(auth2);

      await authzClient.get('https://api.example.com/secure');

      // Both handlers should be called
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle redirect to login scenario', async () => {
      const mockLocation = {
        href: '',
      };
      Object.defineProperty(global, 'window', {
        value: { location: mockLocation },
        writable: true,
      });

      mockFetch.mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, {
        onUnauthorized: () => {
          window.location.href = '/login';
        },
      });

      await authzClient.get('https://api.example.com/secure');

      expect(mockLocation.href).toBe('/login');
    });

    it('should handle token cleanup scenario', async () => {
      const mockLocalStorage = {
        removeItem: vi.fn(),
      };
      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      mockFetch.mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const client = new FetchClient();
      const authzClient = useAuthorization(client, {
        onUnauthorized: () => {
          localStorage.removeItem('auth-token');
        },
      });

      await authzClient.get('https://api.example.com/secure');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth-token');
    });
  });
});

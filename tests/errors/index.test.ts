import { describe, expect, it } from 'vite-plus/test';
import {
  FetchError,
  HttpError,
  NetworkError,
  errorFromResponse,
  throwOnError,
} from '../../src/errors/index';
import type { FetchResponse } from '../../src/client/types';

describe('Error Classes', () => {
  describe('FetchError', () => {
    it('should create a FetchError with message', () => {
      const error = new FetchError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FetchError);
      expect(error.name).toBe('FetchError');
      expect(error.message).toBe('Test error');
      expect(error.cause).toBeUndefined();
    });

    it('should create a FetchError with message and cause', () => {
      const cause = new Error('Root cause');
      const error = new FetchError('Test error', undefined, cause);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FetchError);
      expect(error.name).toBe('FetchError');
      expect(error.message).toBe('Test error');
      expect(error.cause).toBe(cause);
    });

    it('should handle undefined cause explicitly', () => {
      const error = new FetchError('Test error', undefined);

      expect(error.cause).toBeUndefined();
    });

    it('should store a URL when provided', () => {
      const error = new FetchError('Test error', '/api/data');

      expect(error.url).toBe('/api/data');
    });
  });

  describe('HttpError', () => {
    it('should create an HttpError with all properties', () => {
      const body = { error: 'Not found' };
      const error = new HttpError(404, 'Not Found', body, '/api/users');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FetchError);
      expect(error).toBeInstanceOf(HttpError);
      expect(error.name).toBe('HttpError');
      expect(error.message).toBe('HTTP 404 Not Found at /api/users');
      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
      expect(error.body).toBe(body);
    });

    it('should handle different status codes', () => {
      const error500 = new HttpError(
        500,
        'Internal Server Error',
        null,
        '/api/data',
      );
      expect(error500.status).toBe(500);
      expect(error500.statusText).toBe('Internal Server Error');
      expect(error500.message).toBe(
        'HTTP 500 Internal Server Error at /api/data',
      );

      const error401 = new HttpError(
        401,
        'Unauthorized',
        { message: 'Access denied' },
        '/api/secure',
      );
      expect(error401.status).toBe(401);
      expect(error401.statusText).toBe('Unauthorized');
      expect(error401.body).toEqual({ message: 'Access denied' });
    });

    it('should handle null or undefined body', () => {
      const errorWithNull = new HttpError(
        204,
        'No Content',
        null,
        '/api/delete',
      );
      expect(errorWithNull.body).toBeNull();

      const errorWithUndefined = new HttpError(
        404,
        'Not Found',
        undefined,
        '/api/missing',
      );
      expect(errorWithUndefined.body).toBeUndefined();
    });

    it('should handle different URL formats', () => {
      const relativeUrl = new HttpError(400, 'Bad Request', {}, '/api/users');
      expect(relativeUrl.message).toContain('/api/users');

      const absoluteUrl = new HttpError(
        400,
        'Bad Request',
        {},
        'https://api.example.com/users',
      );
      expect(absoluteUrl.message).toContain('https://api.example.com/users');

      const queryParams = new HttpError(
        400,
        'Bad Request',
        {},
        '/api/users?page=1&limit=10',
      );
      expect(queryParams.message).toContain('/api/users?page=1&limit=10');
    });
  });

  describe('NetworkError', () => {
    it('should create a NetworkError with message and URL', () => {
      const error = new NetworkError('Connection timeout', '/api/data');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FetchError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe(
        'Network error for /api/data: Connection timeout',
      );
      expect(error.cause).toBeUndefined();
    });

    it('should create a NetworkError with message, URL, and cause', () => {
      const cause = new TypeError('fetch is not defined');
      const error = new NetworkError('Fetch failed', '/api/users', cause);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Network error for /api/users: Fetch failed');
      expect(error.cause).toBe(cause);
    });

    it('should handle different network error scenarios', () => {
      const timeoutError = new NetworkError('Request timeout', '/api/slow');
      expect(timeoutError.message).toBe(
        'Network error for /api/slow: Request timeout',
      );

      const connectionError = new NetworkError(
        'ECONNREFUSED',
        'http://localhost:3000/api',
      );
      expect(connectionError.message).toBe(
        'Network error for http://localhost:3000/api: ECONNREFUSED',
      );

      const corsError = new NetworkError(
        'CORS policy blocked',
        'https://external-api.com/data',
      );
      expect(corsError.message).toBe(
        'Network error for https://external-api.com/data: CORS policy blocked',
      );
    });

    it('should handle undefined cause explicitly', () => {
      const error = new NetworkError(
        'Connection failed',
        '/api/data',
        undefined,
      );

      expect(error.cause).toBeUndefined();
      expect(error.message).toBe(
        'Network error for /api/data: Connection failed',
      );
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper instanceof relationships', () => {
      const fetchError = new FetchError('Base error');
      const httpError = new HttpError(500, 'Server Error', {}, '/api');
      const networkError = new NetworkError('Network failed', '/api');

      // FetchError
      expect(fetchError).toBeInstanceOf(Error);
      expect(fetchError).toBeInstanceOf(FetchError);
      expect(fetchError).not.toBeInstanceOf(HttpError);
      expect(fetchError).not.toBeInstanceOf(NetworkError);

      // HttpError
      expect(httpError).toBeInstanceOf(Error);
      expect(httpError).toBeInstanceOf(FetchError);
      expect(httpError).toBeInstanceOf(HttpError);
      expect(httpError).not.toBeInstanceOf(NetworkError);

      // NetworkError
      expect(networkError).toBeInstanceOf(Error);
      expect(networkError).toBeInstanceOf(FetchError);
      expect(networkError).not.toBeInstanceOf(HttpError);
      expect(networkError).toBeInstanceOf(NetworkError);
    });

    it('should allow error type discrimination', () => {
      const errors = [
        new FetchError('Generic error'),
        new HttpError(404, 'Not Found', {}, '/api/users'),
        new NetworkError('Connection failed', '/api/data'),
      ];

      const httpErrors = errors.filter((error) => error instanceof HttpError);
      const networkErrors = errors.filter(
        (error) => error instanceof NetworkError,
      );
      const fetchErrors = errors.filter((error) => error instanceof FetchError);

      expect(httpErrors).toHaveLength(1);
      expect(networkErrors).toHaveLength(1);
      expect(fetchErrors).toHaveLength(3); // All inherit from FetchError
    });
  });

  describe('response conversion helpers', () => {
    it('should return data from successful responses', () => {
      const response: FetchResponse<{ id: number }> = {
        data: { id: 1 },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        url: '/api/user',
        ok: true,
        error: null,
      };

      expect(throwOnError(response)).toEqual({ id: 1 });
    });

    it('should convert HTTP failures to HttpError', () => {
      const response: FetchResponse<unknown, { error: string }> = {
        data: null,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        url: '/api/missing',
        ok: false,
        error: {
          message: 'Not Found',
          status: 404,
          statusText: 'Not Found',
          url: '/api/missing',
          body: { error: 'missing' },
        },
      };

      const error = errorFromResponse(response);

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({
        status: 404,
        statusText: 'Not Found',
        body: { error: 'missing' },
        url: '/api/missing',
      });
      expect(() => throwOnError(response)).toThrow(HttpError);
    });

    it('should convert transport failures to NetworkError', () => {
      const cause = new Error('offline');
      const response: FetchResponse<unknown> = {
        data: null,
        status: 0,
        statusText: 'Network Error',
        headers: new Headers(),
        url: '/api/user',
        ok: false,
        error: {
          message: 'offline',
          status: 0,
          statusText: 'Network Error',
          url: '/api/user',
          cause,
        },
      };

      const error = errorFromResponse(response);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Network error for /api/user: offline');
      expect(error.cause).toBe(cause);
      expect(() => throwOnError(response)).toThrow(NetworkError);
    });

    it('should convert aborted or invalid requests to FetchError', () => {
      const response: FetchResponse<unknown> = {
        data: null,
        status: 0,
        statusText: 'Request Aborted',
        headers: new Headers(),
        url: '/api/user',
        ok: false,
        error: {
          message: 'Request was aborted',
          status: 0,
          statusText: 'Request Aborted',
          url: '/api/user',
        },
      };

      const error = errorFromResponse(response);

      expect(error).toBeInstanceOf(FetchError);
      expect(error).not.toBeInstanceOf(NetworkError);
      expect(error).not.toBeInstanceOf(HttpError);
    });

    it('should convert successful-response parsing failures to FetchError', () => {
      const response: FetchResponse<unknown> = {
        data: null,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        url: '/api/user',
        ok: false,
        error: {
          message: 'Failed to parse response body',
          status: 200,
          statusText: 'OK',
          url: '/api/user',
        },
      };

      const error = errorFromResponse(response);

      expect(error).toBeInstanceOf(FetchError);
      expect(error).not.toBeInstanceOf(HttpError);
      expect(error).not.toBeInstanceOf(NetworkError);
    });
  });
});

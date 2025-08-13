import { describe, expect, it } from 'vitest';
import { FetchError, HttpError, NetworkError } from './index';

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
      const error = new FetchError('Test error', cause);
      
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
      const error500 = new HttpError(500, 'Internal Server Error', null, '/api/data');
      expect(error500.status).toBe(500);
      expect(error500.statusText).toBe('Internal Server Error');
      expect(error500.message).toBe('HTTP 500 Internal Server Error at /api/data');

      const error401 = new HttpError(401, 'Unauthorized', { message: 'Access denied' }, '/api/secure');
      expect(error401.status).toBe(401);
      expect(error401.statusText).toBe('Unauthorized');
      expect(error401.body).toEqual({ message: 'Access denied' });
    });

    it('should handle null or undefined body', () => {
      const errorWithNull = new HttpError(204, 'No Content', null, '/api/delete');
      expect(errorWithNull.body).toBeNull();

      const errorWithUndefined = new HttpError(404, 'Not Found', undefined, '/api/missing');
      expect(errorWithUndefined.body).toBeUndefined();
    });

    it('should handle different URL formats', () => {
      const relativeUrl = new HttpError(400, 'Bad Request', {}, '/api/users');
      expect(relativeUrl.message).toContain('/api/users');

      const absoluteUrl = new HttpError(400, 'Bad Request', {}, 'https://api.example.com/users');
      expect(absoluteUrl.message).toContain('https://api.example.com/users');

      const queryParams = new HttpError(400, 'Bad Request', {}, '/api/users?page=1&limit=10');
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
      expect(error.message).toBe('Network error for /api/data: Connection timeout');
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
      expect(timeoutError.message).toBe('Network error for /api/slow: Request timeout');

      const connectionError = new NetworkError('ECONNREFUSED', 'http://localhost:3000/api');
      expect(connectionError.message).toBe('Network error for http://localhost:3000/api: ECONNREFUSED');

      const corsError = new NetworkError('CORS policy blocked', 'https://external-api.com/data');
      expect(corsError.message).toBe('Network error for https://external-api.com/data: CORS policy blocked');
    });

    it('should handle undefined cause explicitly', () => {
      const error = new NetworkError('Connection failed', '/api/data', undefined);
      
      expect(error.cause).toBeUndefined();
      expect(error.message).toBe('Network error for /api/data: Connection failed');
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
        new NetworkError('Connection failed', '/api/data')
      ];

      const httpErrors = errors.filter(error => error instanceof HttpError);
      const networkErrors = errors.filter(error => error instanceof NetworkError);
      const fetchErrors = errors.filter(error => error instanceof FetchError);

      expect(httpErrors).toHaveLength(1);
      expect(networkErrors).toHaveLength(1);
      expect(fetchErrors).toHaveLength(3); // All inherit from FetchError
    });
  });
});

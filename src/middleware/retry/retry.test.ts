import { describe, it, expect, vi } from 'vitest';
import { createRetryMiddleware, createExponentialRetry, createServerErrorRetry } from './retry';

describe('Retry Middleware - Basic Configuration Tests', () => {
  describe('createRetryMiddleware', () => {
    it('should create a middleware function', () => {
      const middleware = createRetryMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should return successful responses immediately', async () => {
      const middleware = createRetryMiddleware();
      const request = new Request('http://localhost/test');
      const response = new Response('ok', { status: 200 });

      const result = await middleware(request, response);
      expect(result).toBe(response);
    });

    it('should accept configuration options', () => {
      const onRetry = vi.fn();
      const shouldRetry = vi.fn(() => false);
      
      const middleware = createRetryMiddleware({
        maxRetries: 5,
        delay: 2000,
        strategy: 'linear',
        shouldRetry,
        onRetry
      });

      expect(typeof middleware).toBe('function');
    });
  });

  describe('createExponentialRetry', () => {
    it('should create middleware with exponential backoff', () => {
      const middleware = createExponentialRetry(3, 1000);
      expect(typeof middleware).toBe('function');
    });
  });

  describe('createServerErrorRetry', () => {
    it('should create middleware for server errors', () => {
      const middleware = createServerErrorRetry(3);
      expect(typeof middleware).toBe('function');
    });
  });
});

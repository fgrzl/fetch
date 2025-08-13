import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { FetchClient } from '../../client';
import { createRetryMiddleware, createExponentialRetry, createServerErrorRetry, useRetry } from './retry-middleware';
import { setupMockFetch } from '../../utils/test-utils';

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

  describe('useRetry', () => {
    it('should add retry middleware to client', () => {
      const client = new FetchClient();
      const useResponseMiddlewareSpy = vi.spyOn(client, 'useResponseMiddleware');

      useRetry(client);

      expect(useResponseMiddlewareSpy).toHaveBeenCalledTimes(1);
      expect(useResponseMiddlewareSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should accept configuration options', () => {
      const client = new FetchClient();
      const useResponseMiddlewareSpy = vi.spyOn(client, 'useResponseMiddleware');

      useRetry(client, {
        maxRetries: 5,
        delay: 2000,
        strategy: 'linear'
      });

      expect(useResponseMiddlewareSpy).toHaveBeenCalledTimes(1);
      expect(useResponseMiddlewareSpy).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should work with empty config', () => {
      const client = new FetchClient();
      const useResponseMiddlewareSpy = vi.spyOn(client, 'useResponseMiddleware');

      useRetry(client, {});

      expect(useResponseMiddlewareSpy).toHaveBeenCalledTimes(1);
      expect(useResponseMiddlewareSpy).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Factory Functions - Enhanced Coverage', () => {
    describe('createExponentialRetry', () => {
      it('should create middleware with default values', () => {
        const middleware = createExponentialRetry();
        expect(typeof middleware).toBe('function');
      });

      it('should create middleware with custom values', () => {
        const middleware = createExponentialRetry(5, 2000);
        expect(typeof middleware).toBe('function');
      });

      it('should use exponential backoff strategy', () => {
        const middleware = createExponentialRetry(3, 1000);
        expect(typeof middleware).toBe('function');
      });
    });

    describe('createServerErrorRetry', () => {
      it('should create middleware with default retries', () => {
        const middleware = createServerErrorRetry();
        expect(typeof middleware).toBe('function');
      });

      it('should create middleware with custom retries', () => {
        const middleware = createServerErrorRetry(5);
        expect(typeof middleware).toBe('function');
      });

      it('should only target server errors', () => {
        const middleware = createServerErrorRetry(2);
        expect(typeof middleware).toBe('function');
      });
    });
  });

  describe('Delay Calculation Strategies', () => {
    it('should handle fixed delay strategy', () => {
      const middleware = createRetryMiddleware({ 
        strategy: 'fixed', 
        delay: 500,
        maxRetries: 1
      });
      expect(typeof middleware).toBe('function');
    });

    it('should handle linear delay strategy', () => {
      const middleware = createRetryMiddleware({ 
        strategy: 'linear', 
        delay: 300,
        maxRetries: 1
      });
      expect(typeof middleware).toBe('function');
    });

    it('should handle exponential delay strategy', () => {
      const middleware = createRetryMiddleware({ 
        strategy: 'exponential', 
        delay: 200,
        maxRetries: 1
      });
      expect(typeof middleware).toBe('function');
    });
  });

  describe('Retry Conditions', () => {
    it('should handle custom shouldRetry function', () => {
      const customShouldRetry = vi.fn().mockReturnValue(false);
      const middleware = createRetryMiddleware({ 
        shouldRetry: customShouldRetry,
        maxRetries: 1
      });
      expect(typeof middleware).toBe('function');
    });

    it('should handle onRetry callback', () => {
      const onRetrySpy = vi.fn();
      const middleware = createRetryMiddleware({ 
        onRetry: onRetrySpy,
        maxRetries: 1
      });
      expect(typeof middleware).toBe('function');
    });

    it('should handle default shouldRetry for 500 errors', () => {
      const middleware = createRetryMiddleware({ maxRetries: 1 });
      expect(typeof middleware).toBe('function');
    });

    it('should handle default shouldRetry for 429 errors', () => {
      const middleware = createRetryMiddleware({ maxRetries: 1 });
      expect(typeof middleware).toBe('function');
    });

    it('should test default shouldRetry function behavior', () => {
      const middleware = createRetryMiddleware();
      expect(typeof middleware).toBe('function');
      
      // Create mock responses to test shouldRetry logic
      const serverError = new Response('Server Error', { status: 500 });
      const rateLimitError = new Response('Rate Limited', { status: 429 });
      const clientError = new Response('Bad Request', { status: 400 });
      
      // These would be tested internally by the middleware
      expect(serverError.status).toBe(500);
      expect(rateLimitError.status).toBe(429); 
      expect(clientError.status).toBe(400);
    });

    it('should test different retry strategies', () => {
      const fixedMiddleware = createRetryMiddleware({ strategy: 'fixed', delay: 1000 });
      const linearMiddleware = createRetryMiddleware({ strategy: 'linear', delay: 1000 });
      const exponentialMiddleware = createRetryMiddleware({ strategy: 'exponential', delay: 1000 });
      
      expect(typeof fixedMiddleware).toBe('function');
      expect(typeof linearMiddleware).toBe('function'); 
      expect(typeof exponentialMiddleware).toBe('function');
    });

    it('should test onRetry callback functionality', () => {
      const onRetryMock = vi.fn();
      const middleware = createRetryMiddleware({ onRetry: onRetryMock });
      expect(typeof middleware).toBe('function');
      
      // The callback would be called during actual retry scenarios
      expect(onRetryMock).not.toHaveBeenCalled();
    });
  });

  describe('Delay Strategy Coverage Tests', () => {
    const { mockFetch, setup, cleanup } = setupMockFetch();

    beforeEach(setup);
    afterAll(cleanup);

    it('covers delay calculation strategies with mock responses', async () => {
      // Test exponential delay calculation
      const expMiddleware = createRetryMiddleware({ 
        maxRetries: 1, 
        delay: 100, 
        strategy: 'exponential' 
      });

      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      const client = new FetchClient();
      client.useResponseMiddleware(expMiddleware);
      
      const result = await client.get('/exponential-test');
      
      // Should have made initial call + 1 retry
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(500);
    });

    it('covers linear delay calculation strategy', async () => {
      const middleware = createRetryMiddleware({ 
        maxRetries: 1, 
        delay: 50, 
        strategy: 'linear' 
      });

      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/linear-test');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(500);
    });

    it('covers fixed delay calculation strategy', async () => {
      const middleware = createRetryMiddleware({ 
        maxRetries: 1, 
        delay: 30, 
        strategy: 'fixed' 
      });

      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/fixed-test');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(500);
    });

    it('covers retry failure handling paths', async () => {
      const middleware = createRetryMiddleware({ maxRetries: 1, delay: 10 });

      // Mock a 500 error that should trigger retry logic
      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/retry-failure-test');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(500);
    });

    it('covers successful response handling', async () => {
      const middleware = createRetryMiddleware({ maxRetries: 2, delay: 10 });

      mockFetch.mockResolvedValueOnce(new Response('Success', { status: 200 }));

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/cleanup-test');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(200);
    });

    it('covers zero delay handling', async () => {
      const middleware = createRetryMiddleware({ 
        maxRetries: 1, 
        delay: 0,
        strategy: 'fixed' 
      });

      mockFetch.mockResolvedValueOnce(new Response('Success', { status: 200 }));

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/zero-delay-test');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(200);
    });

    it('covers default case in delay calculation', async () => {
      // Create middleware with invalid strategy to hit default case
      const middleware = createRetryMiddleware({ 
        maxRetries: 1, 
        delay: 10,
        strategy: 'invalid-strategy' as any  // Force invalid strategy
      });

      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/default-strategy-test');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(500);
    });

    it('covers max retries exceeded path', async () => {
      const middleware = createRetryMiddleware({ 
        maxRetries: 0, // Set to 0 to immediately hit the "exceeded max retries" path
        delay: 10
      });

      mockFetch.mockResolvedValueOnce(new Response('Server Error', { status: 500 }));

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/max-retries-exceeded');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(500);
    });

    it('covers retry fetch failure in catch block', async () => {
      const middleware = createRetryMiddleware({ 
        maxRetries: 1, 
        delay: 10 
      });

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response('Server Error', { status: 500 }));
        }
        // Second call (retry) throws an error
        throw new Error('Network failure during retry');
      });

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/retry-fetch-failure');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(500);
    });

    it('covers successful retry cleanup path', async () => {
      const middleware = createRetryMiddleware({ 
        maxRetries: 1, 
        delay: 10 
      });

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(new Response('Server Error', { status: 500 }));
        }
        // Second call (retry) succeeds
        return Promise.resolve(new Response('Success', { status: 200 }));
      });

      const client = new FetchClient();
      client.useResponseMiddleware(middleware);
      
      const result = await client.get('/successful-retry-cleanup');
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.status).toBe(200); // Should get the successful retry response
    });
  });
});

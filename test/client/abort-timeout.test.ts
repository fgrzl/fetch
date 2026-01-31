/**
 * @fileoverview Tests for AbortController, timeout, and cancellation features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../src/client/fetch-client';

describe('AbortController and Timeout Support', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('AbortController Support', () => {
    it('should support manual cancellation with AbortController', async () => {
      const client = new FetchClient();
      const controller = new AbortController();

      let fetchPromise: Promise<Response>;
      mockFetch.mockImplementation((url, init: RequestInit) => {
        fetchPromise = new Promise((_, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The user aborted a request.', 'AbortError'),
              );
            });
          }
        });
        return fetchPromise;
      });

      const requestPromise = client.get(
        '/api/slow',
        {},
        { signal: controller.signal },
      );

      // Cancel after a short delay
      vi.advanceTimersByTime(10);
      controller.abort();

      const response = await requestPromise;

      expect(response.ok).toBe(false);
      expect(response.status).toBe(0);
      expect(response.statusText).toBe('Request Aborted');
      expect(response.error?.message).toBe('Request was aborted');
    });

    it('should cancel POST requests with AbortController', async () => {
      const client = new FetchClient();
      const controller = new AbortController();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((_, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The user aborted a request.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.post(
        '/api/users',
        { name: 'John' },
        {},
        { signal: controller.signal },
      );

      vi.advanceTimersByTime(10);
      controller.abort();

      const response = await requestPromise;

      expect(response.ok).toBe(false);
      expect(response.error?.message).toBe('Request was aborted');
    });

    it('should pass AbortSignal to fetch', async () => {
      const client = new FetchClient();
      const controller = new AbortController();

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      await client.get('/api/test', {}, { signal: controller.signal });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          signal: controller.signal,
        }),
      );
    });
  });

  describe('Timeout Support', () => {
    it('should timeout after specified duration', async () => {
      const client = new FetchClient();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.get('/api/slow', {}, { timeout: 100 });

      // Advance time past the timeout
      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
      expect(response.status).toBe(0);
      expect(response.statusText).toBe('Request Aborted');
    });

    it('should use default timeout from client config', async () => {
      const client = new FetchClient({ timeout: 100 });

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.get('/api/slow');

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
      expect(response.statusText).toBe('Request Aborted');
    });

    it('should complete requests that finish before timeout', async () => {
      const client = new FetchClient();

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: 'fast' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const response = await client.get('/api/fast', {}, { timeout: 1000 });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should override default timeout with request-specific timeout', async () => {
      const client = new FetchClient({ timeout: 1000 });

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.get('/api/test', {}, { timeout: 100 });

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
    });

    it('should handle requests with no timeout', async () => {
      const client = new FetchClient();

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const response = await client.get('/api/test');

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe('Combined Signal and Timeout', () => {
    it('should respect user signal when timeout is also set', async () => {
      const client = new FetchClient();
      const controller = new AbortController();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The user aborted a request.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.get(
        '/api/test',
        {},
        { signal: controller.signal, timeout: 5000 },
      );

      // User cancels before timeout
      vi.advanceTimersByTime(10);
      controller.abort();

      const response = await requestPromise;

      expect(response.ok).toBe(false);
      expect(response.error?.message).toBe('Request was aborted');
    });

    it('should handle timeout when user signal is also provided', async () => {
      const client = new FetchClient();
      const controller = new AbortController();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.get(
        '/api/slow',
        {},
        { signal: controller.signal, timeout: 100 },
      );

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
      expect(response.statusText).toBe('Request Aborted');
    });
  });

  describe('All HTTP Methods', () => {
    it('should support timeout on HEAD requests', async () => {
      const client = new FetchClient();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.head('/api/resource', {}, { timeout: 100 });

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
    });

    it('should support timeout on POST requests', async () => {
      const client = new FetchClient();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.post(
        '/api/users',
        { name: 'John' },
        {},
        { timeout: 100 },
      );

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
    });

    it('should support timeout on PUT requests', async () => {
      const client = new FetchClient();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.put(
        '/api/users/1',
        { name: 'John' },
        {},
        { timeout: 100 },
      );

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
    });

    it('should support timeout on PATCH requests', async () => {
      const client = new FetchClient();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.patch(
        '/api/users/1',
        { name: 'John' },
        {},
        { timeout: 100 },
      );

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
    });

    it('should support timeout on DELETE requests', async () => {
      const client = new FetchClient();

      mockFetch.mockImplementation((url, init: RequestInit) => {
        return new Promise((resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });

      const requestPromise = client.del('/api/users/1', {}, { timeout: 100 });

      await vi.advanceTimersByTimeAsync(150);

      const response = await requestPromise;

      expect(response.ok).toBe(false);
    });
  });
});

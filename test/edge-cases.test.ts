/**
 * @fileoverview Additional tests for edge cases and error handling to reach 100% coverage.
 *
 * This file tests specific scenarios that are not covered by the main test suites:
 * - Network errors and error handling
 * - Different response content types
 * - Edge cases in middleware execution
 * - Production stack configurations without certain middleware
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../src/client/fetch-client';
import { useProductionStack } from '../src/middleware';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('FetchClient Error Handling', () => {
    it('should handle network errors properly', async () => {
      // Mock fetch to throw a network error
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/test');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(0);
      expect(response.statusText).toBe('Network Error');
      expect(response.error?.message).toBe('Failed to fetch');
      expect(response.data).toBeNull();
    });

    it('should handle other TypeError network errors', async () => {
      // Mock fetch to throw a TypeError with 'fetch' in message
      mockFetch.mockRejectedValueOnce(
        new TypeError('Network request failed: fetch error'),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/test');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(0);
      expect(response.statusText).toBe('Network Error');
      expect(response.error?.message).toBe('Failed to fetch');
    });

    it('should re-throw non-fetch TypeErrors', async () => {
      // Mock fetch to throw a different kind of TypeError
      const customError = new TypeError('Some other error');
      mockFetch.mockRejectedValueOnce(customError);

      const client = new FetchClient();

      await expect(client.get('http://example.com/api/test')).rejects.toThrow(
        customError,
      );
    });

    it('should re-throw non-TypeError errors', async () => {
      // Mock fetch to throw a non-TypeError
      const customError = new Error('Some other error');
      mockFetch.mockRejectedValueOnce(customError);

      const client = new FetchClient();

      await expect(client.get('http://example.com/api/test')).rejects.toThrow(
        customError,
      );
    });
  });

  describe('Response Content Type Parsing', () => {
    it('should handle text responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('plain text response', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/text');

      expect(response.ok).toBe(true);
      expect(response.data).toBe('plain text response');
    });

    it('should handle HTML responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('<html><body>Hello</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/html');

      expect(response.ok).toBe(true);
      expect(response.data).toBe('<html><body>Hello</body></html>');
    });

    it('should handle blob responses for images', async () => {
      const mockBlob = new Blob(['fake image data'], { type: 'image/png' });
      mockFetch.mockResolvedValueOnce(
        new Response(mockBlob, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/image.png');

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data).toHaveProperty('type', 'image/png');
    });

    it('should handle blob responses for videos', async () => {
      const mockBlob = new Blob(['fake video data'], { type: 'video/mp4' });
      mockFetch.mockResolvedValueOnce(
        new Response(mockBlob, {
          status: 200,
          headers: { 'content-type': 'video/mp4' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/video.mp4');

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data).toHaveProperty('type', 'video/mp4');
    });

    it('should handle blob responses for audio', async () => {
      const mockBlob = new Blob(['fake audio data'], { type: 'audio/mp3' });
      mockFetch.mockResolvedValueOnce(
        new Response(mockBlob, {
          status: 200,
          headers: { 'content-type': 'audio/mp3' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/audio.mp3');

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data).toHaveProperty('type', 'audio/mp3');
    });

    it('should handle octet-stream responses', async () => {
      const mockBlob = new Blob(['binary data']);
      mockFetch.mockResolvedValueOnce(
        new Response(mockBlob, {
          status: 200,
          headers: { 'content-type': 'application/octet-stream' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/binary');

      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
      // For octet-stream, we just verify it's blob-like
      expect(typeof response.data).toBe('object');
    });

    it('should handle responses with body but unknown content type as text', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('some content', {
          status: 200,
          headers: { 'content-type': 'application/unknown' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/unknown');

      expect(response.ok).toBe(true);
      expect(response.data).toBe('some content');
    });

    it('should handle empty responses with body', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('', {
          status: 200,
          headers: { 'content-type': 'application/unknown' },
        }),
      );

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/empty');

      expect(response.ok).toBe(true);
      expect(response.data).toBeNull();
    });

    it('should handle responses without body', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        url: 'http://example.com/api/nocontent',
        body: null,
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn(),
        blob: vi.fn(),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const client = new FetchClient();
      const response = await client.get('http://example.com/api/nocontent');

      expect(response.ok).toBe(true);
      expect(response.data).toBeNull();
    });
  });

  describe('Middleware Edge Cases', () => {
    it('should handle middleware that does not call next', async () => {
      const client = new FetchClient();

      // Add a middleware that returns directly without calling next
      client.use(async () => {
        return {
          data: 'intercepted',
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          url: 'http://example.com/intercepted',
          ok: true,
        };
      });

      const response = await client.get('http://example.com/api/test');

      expect(response.data).toBe('intercepted');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Production Stack Configurations', () => {
    it('should work with production stack without auth middleware', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      const prodClient = useProductionStack(client, {
        // No auth provided - should skip auth middleware
        cache: { ttl: 1000, methods: ['GET'] },
        retry: { maxRetries: 1 },
        logging: { level: 'error' },
        rateLimit: { maxRequests: 10, windowMs: 1000 },
      });

      await prodClient.get('http://example.com/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should work with production stack without cache middleware', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      const prodClient = useProductionStack(client, {
        auth: { tokenProvider: () => 'test-token' },
        // cache: undefined - should skip cache middleware
        retry: { maxRetries: 1 },
        logging: { level: 'error' },
        rateLimit: { maxRequests: 10, windowMs: 1000 },
      });

      await prodClient.get('http://example.com/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should work with production stack without retry middleware', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      const prodClient = useProductionStack(client, {
        auth: { tokenProvider: () => 'test-token' },
        cache: { ttl: 1000, methods: ['GET'] },
        // retry: undefined - should skip retry middleware
        logging: { level: 'error' },
        rateLimit: { maxRequests: 10, windowMs: 1000 },
      });

      await prodClient.get('http://example.com/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should work with production stack without rate limit middleware', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      const prodClient = useProductionStack(client, {
        auth: { tokenProvider: () => 'test-token' },
        cache: { ttl: 1000, methods: ['GET'] },
        retry: { maxRetries: 1 },
        logging: { level: 'error' },
        // rateLimit: undefined - should skip rate limit middleware
      });

      await prodClient.get('http://example.com/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should work with production stack without logging middleware', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      const prodClient = useProductionStack(client, {
        auth: { tokenProvider: () => 'test-token' },
        cache: { ttl: 1000, methods: ['GET'] },
        retry: { maxRetries: 1 },
        // logging: undefined - should skip logging middleware
        rateLimit: { maxRequests: 10, windowMs: 1000 },
      });

      await prodClient.get('http://example.com/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('FetchClient Additional Methods', () => {
    it('should handle HEAD requests', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            'content-type': 'text/plain',
            'content-length': '100',
            'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
            etag: '"abc123"',
            'cache-control': 'max-age=3600',
          },
        }),
      );

      const client = new FetchClient();
      const response = await client.head('http://example.com/api/resource');

      expect(response.ok).toBe(true);
      expect(response.data).toBe(''); // HEAD responses with text content-type return empty string
      expect(mockFetch).toHaveBeenCalledWith(
        'http://example.com/api/resource',
        expect.objectContaining({ method: 'HEAD' }),
      );
    });

    it('should handle HEAD requests with query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      );

      const client = new FetchClient();
      await client.head('http://example.com/api/resource', {
        version: 'v1',
        format: 'json',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://example.com/api/resource?version=v1&format=json',
        expect.objectContaining({ method: 'HEAD' }),
      );
    });

    it('should handle headMetadata method', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            'content-type': 'text/plain',
            'content-length': '150',
            'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
            etag: '"def456"',
            'cache-control': 'max-age=7200',
          },
        }),
      );

      const client = new FetchClient();
      const metadata = await client.headMetadata('http://example.com/api/data');

      expect(metadata.ok).toBe(true);
      expect(metadata.exists).toBe(true);
      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.contentLength).toBe(150);
      expect(metadata.lastModified).toBeInstanceOf(Date);
      expect(metadata.etag).toBe('"def456"');
      expect(metadata.cacheControl).toBe('max-age=7200');
    });

    it('should handle headMetadata method when resource does not exist', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 404,
          headers: {},
        }),
      );

      const client = new FetchClient();
      const metadata = await client.headMetadata(
        'http://example.com/api/missing',
      );

      expect(metadata.ok).toBe(false);
      expect(metadata.exists).toBe(false);
      expect(metadata.contentType).toBeUndefined();
      expect(metadata.contentLength).toBeUndefined();
      expect(metadata.lastModified).toBeUndefined();
      expect(metadata.etag).toBeUndefined();
      expect(metadata.cacheControl).toBeUndefined();
    });

    it('should handle headMetadata method with partial headers', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            'content-type': 'text/plain',
            // Missing other headers to test undefined handling
          },
        }),
      );

      const client = new FetchClient();
      const metadata = await client.headMetadata(
        'http://example.com/api/simple',
      );

      expect(metadata.ok).toBe(true);
      expect(metadata.exists).toBe(true);
      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.contentLength).toBeUndefined();
      expect(metadata.lastModified).toBeUndefined();
      expect(metadata.etag).toBeUndefined();
      expect(metadata.cacheControl).toBeUndefined();
    });
  });

  describe('URL Building Edge Cases', () => {
    it('should handle relative URLs properly', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      await client.get('/api/relative', { param: 'value' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/relative?param=value',
        expect.any(Object),
      );
    });
  });

  describe('Middleware Execution Edge Cases', () => {
    it('should handle empty middleware array', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();
      // Don't add any middleware - should go straight to core fetch
      const response = await client.get('http://example.com/api/direct');

      expect(response.ok).toBe(true);
      expect(response.data).toEqual({ success: true });
    });

    it('should handle middleware that modifies request and calls next', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ modified: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const client = new FetchClient();

      // Add middleware that modifies request
      client.use(async (request, next) => {
        const modifiedRequest = {
          ...request,
          headers: { ...request.headers, 'X-Modified': 'true' },
        };
        return await next(modifiedRequest);
      });

      const response = await client.get('http://example.com/api/test');

      expect(response.ok).toBe(true);
      expect(response.data).toEqual({ modified: true });

      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.['X-Modified']).toBe('true');
    });
  });
});

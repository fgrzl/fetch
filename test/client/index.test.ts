/**
 * @fileoverview Tests for client module exports.
 * 
 * This test ensures that the client module properly exports:
 * 1. FetchClient class
 * 2. Types for TypeScript users
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FetchClient } from '../../src/client/index';
import type { FetchMiddleware, FetchResponse, FetchClientOptions } from '../../src/client/index';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Client Module Exports', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('FetchClient Export', () => {
    it('should export FetchClient class from client index', () => {
      expect(FetchClient).toBeDefined();
      expect(typeof FetchClient).toBe('function');
    });

    it('should create a functional FetchClient instance', async () => {
      const client = new FetchClient();
      expect(client).toBeDefined();
      expect(typeof client.get).toBe('function');
      
      const response = await client.get('/test');
      expect(response.data).toEqual({ success: true });
    });

    it('should support constructor options', () => {
      const options: FetchClientOptions = {
        credentials: 'include'
      };
      
      const client = new FetchClient(options);
      expect(client).toBeDefined();
    });
  });

  describe('Middleware Type Usage', () => {
    it('should support FetchMiddleware type in middleware', async () => {
      const client = new FetchClient();
      
      const testMiddleware: FetchMiddleware = async (request, next) => {
        request.headers = { 
          ...request.headers, 
          'X-Test': 'middleware-applied' 
        };
        return await next(request);
      };
      
      client.use(testMiddleware);
      
      await client.get('/test');
      
      const [, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.['X-Test']).toBe('middleware-applied');
    });
  });

  describe('Response Type Usage', () => {
    it('should return properly typed FetchResponse', async () => {
      const client = new FetchClient();
      
      const response: FetchResponse<{ success: boolean }> = await client.get('/test');
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
      
      // TypeScript should know this is { success: boolean }
      if (response.ok && response.data) {
        expect(typeof response.data.success).toBe('boolean');
      }
    });
  });

  describe('Type Exports Verification', () => {
    it('should make types available without runtime errors', () => {
      // This test ensures types are properly exported and can be imported
      // If there were type export issues, this would fail at compile time
      
      const options: FetchClientOptions = { credentials: 'include' };
      expect(options.credentials).toBe('include');
      
      const middleware: FetchMiddleware = async (req, next) => next(req);
      expect(typeof middleware).toBe('function');
    });
  });
});

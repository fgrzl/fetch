/**
 * @fileoverview Enhanced fetch client with intercept middleware architecture.
 */

import type { FetchResponse, FetchClientOptions } from './types';

/**
 * Intercept middleware type that allows full control over request/response cycle.
 * Middleware can modify requests, handle responses, implement retries, etc.
 */
export type FetchMiddleware = (
  request: RequestInit & { url?: string },
  next: (
    modifiedRequest?: RequestInit & { url?: string },
  ) => Promise<FetchResponse<unknown>>,
) => Promise<FetchResponse<unknown>>;

/**
 * Enhanced HTTP client with intercept middleware architecture.
 *
 * Features:
 * - 🎯 Smart defaults (JSON content-type, same-origin credentials)
 * - 🔧 Powerful middleware system for cross-cutting concerns
 * - 🛡️ Consistent error handling (never throws, always returns response)
 * - 📦 TypeScript-first with full type inference
 * - 🚀 Modern async/await API
 *
 * @example Basic usage:
 * ```typescript
 * const client = new FetchClient();
 *
 * // GET request - just works
 * const users = await client.get<User[]>('/api/users');
 * if (users.ok) {
 *   console.log(users.data); // Type is User[]
 * }
 *
 * // POST request - JSON by default
 * const result = await client.post('/api/users', { name: 'John' });
 * ```
 *
 * @example With middleware:
 * ```typescript
 * const client = new FetchClient();
 *
 * // Add auth middleware
 * client.use((request, next) => {
 *   request.headers = { ...request.headers, Authorization: 'Bearer token' };
 *   return next(request);
 * });
 *
 * // Now all requests include auth
 * const data = await client.get('/api/protected');
 * ```
 */
export class FetchClient {
  private middlewares: FetchMiddleware[] = [];
  private credentials: RequestCredentials;

  constructor(config: FetchClientOptions = {}) {
    this.credentials = config.credentials ?? 'same-origin';
  }

  use(middleware: FetchMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  async request<T = unknown>(
    url: string,
    init: RequestInit = {},
  ): Promise<FetchResponse<T>> {
    // Create the execution chain
    let index = 0;

    const execute = async (
      request?: RequestInit & { url?: string },
    ): Promise<FetchResponse<unknown>> => {
      // Use provided request or fall back to original
      const currentRequest = request || { ...init, url };
      const currentUrl = currentRequest.url || url;

      if (index >= this.middlewares.length) {
        // Core fetch - end of middleware chain
        const { url: _, ...requestInit } = currentRequest; // Remove url from request init
        return this.coreFetch(requestInit, currentUrl);
      }

      const middleware = this.middlewares[index++];
      if (!middleware) {
        const { url: _, ...requestInit } = currentRequest;
        return this.coreFetch(requestInit, currentUrl);
      }
      return middleware(currentRequest, execute);
    };

    const result = await execute();
    return result as FetchResponse<T>;
  }

  private async coreFetch(
    request: RequestInit,
    url: string,
  ): Promise<FetchResponse<unknown>> {
    try {
      const finalInit = {
        credentials: this.credentials,
        ...request,
      };

      const response = await fetch(url, finalInit);
      const data = await this.parseResponse(response);

      return {
        data: response.ok ? data : null,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        url: response.url,
        ok: response.ok,
        ...(response.ok
          ? {}
          : {
              error: {
                message: response.statusText,
                body: data,
              },
            }),
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          data: null,
          status: 0,
          statusText: 'Network Error',
          headers: new Headers(),
          url,
          ok: false,
          error: {
            message: 'Failed to fetch',
            body: error,
          },
        };
      }
      throw error;
    }
  }

  private async parseResponse(res: Response): Promise<unknown> {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return res.json();
    }

    if (contentType.includes('text/')) {
      return res.text();
    }

    if (
      contentType.includes('application/octet-stream') ||
      contentType.includes('image/') ||
      contentType.includes('video/') ||
      contentType.includes('audio/')
    ) {
      return res.blob();
    }

    if (res.body) {
      const text = await res.text();
      return text || null;
    }

    return null;
  }

  // 🎯 PIT OF SUCCESS: Convenience methods with smart defaults

  /**
   * GET request - simple and clean.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @returns Promise resolving to typed response
   *
   * @example
   * ```typescript
   * const users = await client.get<User[]>('/api/users');
   * if (users.ok) console.log(users.data);
   * ```
   */
  get<T>(url: string): Promise<FetchResponse<T>> {
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request with automatic JSON serialization.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON)
   * @param headers - Additional headers (Content-Type: application/json is default)
   * @returns Promise resolving to typed response
   *
   * @example
   * ```typescript
   * const result = await client.post<User>('/api/users', { name: 'John' });
   * ```
   */
  post<T>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<FetchResponse<T>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    };

    return this.request<T>(url, {
      method: 'POST',
      headers: requestHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  /**
   * PUT request with automatic JSON serialization.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON)
   * @param headers - Additional headers (Content-Type: application/json is default)
   * @returns Promise resolving to typed response
   */
  put<T>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<FetchResponse<T>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    };

    return this.request<T>(url, {
      method: 'PUT',
      headers: requestHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  /**
   * PATCH request with automatic JSON serialization.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON)
   * @param headers - Additional headers (Content-Type: application/json is default)
   * @returns Promise resolving to typed response
   */
  patch<T>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<FetchResponse<T>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    };

    return this.request<T>(url, {
      method: 'PATCH',
      headers: requestHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  }

  /**
   * DELETE request.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @returns Promise resolving to typed response
   *
   * @example
   * ```typescript
   * const result = await client.del('/api/users/123');
   * if (result.ok) console.log('Deleted successfully');
   * ```
   */
  del<T>(url: string): Promise<FetchResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' });
  }
}

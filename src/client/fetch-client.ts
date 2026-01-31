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
  private baseUrl: string | undefined;
  private defaultTimeout: number | undefined;

  constructor(config: FetchClientOptions = {}) {
    this.credentials = config.credentials ?? 'same-origin';
    this.baseUrl = config.baseUrl;
    this.defaultTimeout = config.timeout;
  }

  use(middleware: FetchMiddleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Set or update the base URL for this client instance.
   *
   * When a base URL is set, relative URLs will be resolved against it.
   * Absolute URLs will continue to work unchanged.
   *
   * @param baseUrl - The base URL to set, or undefined to clear it
   * @returns The client instance for method chaining
   *
   * @example Set base URL:
   * ```typescript
   * const client = new FetchClient();
   * client.setBaseUrl('https://api.example.com');
   *
   * // Now relative URLs work
   * await client.get('/users'); // → GET https://api.example.com/users
   * ```
   *
   * @example Chain with middleware:
   * ```typescript
   * const client = addProductionStack(new FetchClient())
   *   .setBaseUrl(process.env.API_BASE_URL);
   * ```
   */
  setBaseUrl(baseUrl?: string): this {
    this.baseUrl = baseUrl;
    return this;
  }

  async request<T = unknown>(
    url: string,
    init: RequestInit = {},
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<FetchResponse<T>> {
    // Resolve URL against baseUrl if relative
    const resolvedUrl = this.resolveUrl(url);

    // Handle timeout and signal
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timeoutController: AbortController | undefined;
    let effectiveSignal = options?.signal || init.signal;

    // Create timeout if specified (request-level timeout takes precedence)
    const timeoutMs = options?.timeout ?? this.defaultTimeout;
    if (timeoutMs && timeoutMs > 0) {
      timeoutController = new AbortController();

      // If user provided a signal, we need to combine them
      if (effectiveSignal) {
        // Listen to user's signal and propagate abort
        effectiveSignal.addEventListener('abort', () => {
          timeoutController?.abort();
        });
      }

      effectiveSignal = timeoutController.signal;

      // Set timeout to abort the request
      timeoutId = setTimeout(() => {
        timeoutController?.abort();
      }, timeoutMs);
    }

    // Create the execution chain
    let index = 0;

    const execute = async (
      request?: RequestInit & { url?: string },
    ): Promise<FetchResponse<unknown>> => {
      // Use provided request or fall back to original
      const currentRequest: RequestInit & { url?: string } = request || {
        ...init,
        url: resolvedUrl,
        ...(effectiveSignal ? { signal: effectiveSignal } : {}),
      };
      const currentUrl = currentRequest.url || resolvedUrl;

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

    try {
      const result = await execute();
      return result as FetchResponse<T>;
    } finally {
      // Clean up timeout
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
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

      // Convert Headers object to plain object for better compatibility
      if (finalInit.headers instanceof Headers) {
        const headersObj: Record<string, string> = {};
        finalInit.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
        finalInit.headers = headersObj;
      }

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
      // Handle AbortError (from timeout or manual cancellation)
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          data: null,
          status: 0,
          statusText: 'Request Aborted',
          headers: new Headers(),
          url,
          ok: false,
          error: {
            message: 'Request was aborted',
            body: error,
          },
        };
      }

      // Handle network errors
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

  // Helper method to build URL with query parameters
  private buildUrlWithParams(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    if (!params) {
      return url;
    }

    // Resolve the URL first (handles baseUrl if needed)
    const resolvedUrl = this.resolveUrl(url);

    // If the resolved URL is still relative (no base URL configured),
    // manually build query parameters
    if (
      !resolvedUrl.startsWith('http://') &&
      !resolvedUrl.startsWith('https://') &&
      !resolvedUrl.startsWith('//')
    ) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      return queryString ? `${resolvedUrl}?${queryString}` : resolvedUrl;
    }

    // For absolute URLs, use URL constructor
    const urlObj = new URL(resolvedUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, String(value));
      }
    });

    return urlObj.toString();
  }

  /**
   * Resolves a URL with the base URL if it's relative and base URL is configured
   * @param url - The URL to resolve
   * @returns The resolved URL
   * @private
   */
  private resolveUrl(url: string): string {
    // If URL is already absolute, return as-is
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('//')
    ) {
      return url;
    }

    // If no base URL is configured, return the relative URL as-is (backward compatibility)
    if (!this.baseUrl) {
      return url;
    }

    // Resolve relative URL with base URL
    try {
      const baseUrl = new URL(this.baseUrl);
      const resolvedUrl = new URL(url, baseUrl);
      return resolvedUrl.toString();
    } catch {
      throw new Error(
        `Invalid URL: Unable to resolve "${url}" with baseUrl "${this.baseUrl}"`,
      );
    }
  } // 🎯 PIT OF SUCCESS: Convenience methods with smart defaults

  /**
   * HEAD request with query parameter support.
   *
   * HEAD requests are used to retrieve metadata about a resource without downloading
   * the response body. Useful for checking if a resource exists, getting content length,
   * last modified date, etc.
   *
   * @template T - Expected response data type (will be null for HEAD requests)
   * @param url - Request URL
   * @param params - Query parameters to append to URL
   * @param options - Request options (signal, timeout)
   * @returns Promise resolving to typed response (data will always be null)
   *
   * @example Check if resource exists:
   * ```typescript
   * const headResponse = await client.head('/api/large-file.zip');
   * if (headResponse.ok) {
   *   const contentLength = headResponse.headers.get('content-length');
   *   const lastModified = headResponse.headers.get('last-modified');
   *   console.log(`File size: ${contentLength} bytes`);
   * }
   * ```
   *
   * @example With cancellation:
   * ```typescript
   * const controller = new AbortController();
   * const request = client.head('/api/users', { id: 123 }, { signal: controller.signal });
   * controller.abort(); // Cancel the request
   * ```
   */
  head<T = null>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<FetchResponse<T>> {
    const finalUrl = this.buildUrlWithParams(url, params);
    return this.request<T>(finalUrl, { method: 'HEAD' }, options);
  }

  /**
   * HEAD request that returns useful metadata about a resource.
   *
   * This is a convenience method that extracts common metadata from HEAD responses
   * for easier consumption.
   *
   * @param url - Request URL
   * @param params - Query parameters to append to URL
   * @returns Promise resolving to response with extracted metadata
   *
   * @example Get resource metadata:
   * ```typescript
   * const metadata = await client.headMetadata('/api/large-file.zip');
   * if (metadata.ok) {
   *   console.log('File exists:', metadata.exists);
   *   console.log('Content type:', metadata.contentType);
   *   console.log('Size:', metadata.contentLength, 'bytes');
   *   console.log('Last modified:', metadata.lastModified);
   * }
   * ```
   */
  async headMetadata(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<
    FetchResponse<null> & {
      exists: boolean;
      contentType: string | undefined;
      contentLength: number | undefined;
      lastModified: Date | undefined;
      etag: string | undefined;
      cacheControl: string | undefined;
    }
  > {
    const response = await this.head(url, params);

    const contentLengthHeader = response.headers.get('content-length');
    const lastModifiedHeader = response.headers.get('last-modified');

    return {
      ...response,
      exists: response.ok,
      contentType: response.headers.get('content-type') || undefined,
      contentLength: contentLengthHeader
        ? parseInt(contentLengthHeader, 10)
        : undefined,
      lastModified: lastModifiedHeader
        ? new Date(lastModifiedHeader)
        : undefined,
      etag: response.headers.get('etag') || undefined,
      cacheControl: response.headers.get('cache-control') || undefined,
    };
  }

  /**
   * GET request with query parameter support.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param params - Query parameters to append to URL
   * @param options - Request options (signal, timeout)
   * @returns Promise resolving to typed response
   *
   * @example
   * ```typescript
   * const users = await client.get<User[]>('/api/users');
   * const filteredUsers = await client.get<User[]>('/api/users', { status: 'active', limit: 10 });
   * if (users.ok) console.log(users.data);
   * ```
   *
   * @example With timeout:
   * ```typescript
   * const users = await client.get<User[]>('/api/users', {}, { timeout: 5000 });
   * ```
   */
  get<T>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<FetchResponse<T>> {
    const finalUrl = this.buildUrlWithParams(url, params);
    return this.request<T>(finalUrl, { method: 'GET' }, options);
  }

  /**
   * POST request with automatic JSON serialization.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON)
   * @param headers - Additional headers (Content-Type: application/json is default)
   * @param options - Request options (signal, timeout)
   * @returns Promise resolving to typed response
   *
   * @example
   * ```typescript
   * const result = await client.post<User>('/api/users', { name: 'John' });
   * ```
   *
   * @example With cancellation:
   * ```typescript
   * const controller = new AbortController();
   * const result = client.post('/api/users', { name: 'John' }, {}, { signal: controller.signal });
   * controller.abort();
   * ```
   */
  post<T>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<FetchResponse<T>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    };

    return this.request<T>(
      url,
      {
        method: 'POST',
        headers: requestHeaders,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
      options,
    );
  }

  /**
   * PUT request with automatic JSON serialization.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON)
   * @param headers - Additional headers (Content-Type: application/json is default)
   * @param options - Request options (signal, timeout)
   * @returns Promise resolving to typed response
   */
  put<T>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<FetchResponse<T>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    };

    return this.request<T>(
      url,
      {
        method: 'PUT',
        headers: requestHeaders,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
      options,
    );
  }

  /**
   * PATCH request with automatic JSON serialization.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param body - Request body (auto-serialized to JSON)
   * @param headers - Additional headers (Content-Type: application/json is default)
   * @param options - Request options (signal, timeout)
   * @returns Promise resolving to typed response
   */
  patch<T>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<FetchResponse<T>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    };

    return this.request<T>(
      url,
      {
        method: 'PATCH',
        headers: requestHeaders,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      },
      options,
    );
  }

  /**
   * DELETE request with query parameter support.
   *
   * @template T - Expected response data type
   * @param url - Request URL
   * @param params - Query parameters to append to URL
   * @param options - Request options (signal, timeout)
   * @returns Promise resolving to typed response
   *
   * @example
   * ```typescript
   * const result = await client.del('/api/users/123');
   * const bulkResult = await client.del('/api/users', { status: 'inactive', force: true });
   * if (result.ok) console.log('Deleted successfully');
   * ```
   */
  del<T>(
    url: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { signal?: AbortSignal; timeout?: number },
  ): Promise<FetchResponse<T>> {
    const finalUrl = this.buildUrlWithParams(url, params);
    return this.request<T>(finalUrl, { method: 'DELETE' }, options);
  }
}

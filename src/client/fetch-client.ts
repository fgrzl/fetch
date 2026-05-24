/**
 * @fileoverview Enhanced fetch client with intercept middleware architecture.
 */

import type {
  FetchResponse,
  FetchClientOptions,
  FetchFailureResponse,
  FetchResponseError,
  FetchSuccessResponse,
  RequestOptions,
} from './types';
import { appendQueryParams, type QueryParams } from './query';

/**
 * Intercept middleware type that allows full control over request/response cycle.
 * Middleware can modify requests, handle responses, implement retries, etc.
 */
export type FetchMiddleware = (
  request: RequestInit & { url?: string },
  next: (
    modifiedRequest?: RequestInit & { url?: string },
  ) => Promise<FetchResponse<unknown, unknown>>,
) => Promise<FetchResponse<unknown, unknown>>;

function headersToObject(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

/**
 * Enhanced HTTP client with intercept middleware architecture.
 *
 * Features:
 * - Small fetch wrapper with JSON defaults and same-origin credentials
 * - Composable middleware for cross-cutting concerns
 * - Response-based handling for HTTP, network, abort, parse, and URL failures
 * - TypeScript-first response narrowing with `ok`
 * - Modern async/await API
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
   * const client = new FetchClient().setBaseUrl(process.env.API_BASE_URL);
   * addRetry(client, { maxRetries: 2 });
   * ```
   */
  setBaseUrl(baseUrl?: string): this {
    this.baseUrl = baseUrl;
    return this;
  }

  async request<T = unknown, E = unknown>(
    url: string,
    init: RequestInit = {},
    options?: RequestOptions,
  ): Promise<FetchResponse<T, E>> {
    const resolved = this.tryResolveUrl(url);
    if (!resolved.ok) {
      return this.createFailureResponse<E>({
        url,
        status: 0,
        statusText: 'Invalid URL',
        message: resolved.message,
        cause: resolved.cause,
      });
    }

    const resolvedUrl = resolved.url;

    // Handle timeout and signal
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timeoutController: AbortController | undefined;
    let removeAbortListener: (() => void) | undefined;
    let effectiveSignal = options?.signal || init.signal;

    // Create timeout if specified (request-level timeout takes precedence)
    const timeoutMs = options?.timeout ?? this.defaultTimeout;
    if (timeoutMs && timeoutMs > 0) {
      timeoutController = new AbortController();

      // If user provided a signal, we need to combine them
      if (effectiveSignal) {
        const sourceSignal = effectiveSignal;
        const abortFromSource = () => {
          timeoutController?.abort();
        };

        if (sourceSignal.aborted) {
          abortFromSource();
        } else {
          sourceSignal.addEventListener('abort', abortFromSource, {
            once: true,
          });
          removeAbortListener = () => {
            sourceSignal.removeEventListener('abort', abortFromSource);
          };
        }
      }

      effectiveSignal = timeoutController.signal;

      // Set timeout to abort the request
      timeoutId = setTimeout(() => {
        timeoutController?.abort();
      }, timeoutMs);
    }

    // Add operation ID header if provided
    if (options?.operationId) {
      init.headers = {
        ...headersToObject(init.headers),
        'x-operation-id': options.operationId,
      };
    }

    const execute = async (
      middlewareIndex: number,
      request: RequestInit & { url?: string },
    ): Promise<FetchResponse<unknown, unknown>> => {
      const currentUrl = request.url || resolvedUrl;

      if (middlewareIndex >= this.middlewares.length) {
        // Core fetch - end of middleware chain
        const { url: _, ...requestInit } = request; // Remove url from request init
        return this.coreFetch(requestInit, currentUrl);
      }

      const middleware = this.middlewares[middlewareIndex];
      if (!middleware) {
        const { url: _, ...requestInit } = request;
        return this.coreFetch(requestInit, currentUrl);
      }

      return middleware(request, (modifiedRequest = request) =>
        execute(middlewareIndex + 1, modifiedRequest),
      );
    };

    try {
      const result = await execute(0, {
        ...init,
        url: resolvedUrl,
        ...(effectiveSignal ? { signal: effectiveSignal } : {}),
      });
      return result as FetchResponse<T, E>;
    } finally {
      // Clean up timeout
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      removeAbortListener?.();
    }
  }

  private async coreFetch(
    request: RequestInit,
    url: string,
  ): Promise<FetchResponse<unknown, unknown>> {
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

      let data: unknown;
      try {
        data = await this.parseResponse(response);
      } catch (error) {
        return this.createFailureResponse({
          url: response.url || url,
          status: response.status,
          statusText: response.statusText || 'Parse Error',
          headers: response.headers,
          message: 'Failed to parse response body',
          cause: error,
        });
      }

      if (response.ok) {
        return this.createSuccessResponse({
          data,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          url: response.url || url,
        });
      }

      return this.createFailureResponse({
        url: response.url || url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        message: response.statusText || `HTTP ${response.status}`,
        body: data,
      });
    } catch (error) {
      // Handle AbortError (from timeout or manual cancellation)
      if (error instanceof Error && error.name === 'AbortError') {
        return this.createFailureResponse({
          url,
          status: 0,
          statusText: 'Request Aborted',
          message: 'Request was aborted',
          cause: error,
        });
      }

      return this.createFailureResponse({
        url,
        status: 0,
        statusText: 'Network Error',
        message:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Failed to fetch',
        cause: error,
      });
    }
  }

  private async parseResponse(res: Response): Promise<unknown> {
    const contentType = res.headers.get('content-type') || '';

    if (!res.body) {
      return null;
    }

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

    const text = await res.text();
    return text || null;
  }

  // Helper method to build URL with query parameters
  private buildUrlWithParams(url: string, params?: QueryParams): string {
    if (!params) {
      return url;
    }

    return appendQueryParams(this.resolveUrl(url), params);
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

    // Relative URLs are valid for browser-origin requests without a configured base.
    if (!this.baseUrl) {
      return url;
    }

    const baseUrl = new URL(this.baseUrl);
    const resolvedUrl = new URL(url, baseUrl);
    return resolvedUrl.toString();
  }

  private tryResolveUrl(
    url: string,
  ):
    | { ok: true; url: string }
    | { ok: false; message: string; cause: unknown } {
    try {
      return { ok: true, url: this.resolveUrl(url) };
    } catch (error) {
      return {
        ok: false,
        message: `Invalid URL: Unable to resolve "${url}" with baseUrl "${this.baseUrl}"`,
        cause: error,
      };
    }
  }

  private createSuccessResponse<T>({
    data,
    status,
    statusText,
    headers,
    url,
  }: {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    url: string;
  }): FetchSuccessResponse<T> {
    return {
      data,
      status,
      statusText,
      headers,
      url,
      ok: true,
      error: null,
    };
  }

  private createFailureResponse<E = unknown>({
    url,
    status,
    statusText,
    headers = new Headers(),
    message,
    body,
    cause,
  }: {
    url: string;
    status: number;
    statusText: string;
    headers?: Headers;
    message: string;
    body?: E;
    cause?: unknown;
  }): FetchFailureResponse<E> {
    const error: FetchResponseError<E> = {
      message,
      status,
      statusText,
      url,
      ...(body !== undefined ? { body } : {}),
      ...(cause !== undefined ? { cause } : {}),
    };

    return {
      data: null,
      status,
      statusText,
      headers,
      url,
      ok: false,
      error,
    };
  }

  private urlFailureResponse<T = unknown, E = unknown>(
    url: string,
    error: unknown,
  ): FetchResponse<T, E> {
    return this.createFailureResponse<E>({
      url,
      status: 0,
      statusText: 'Invalid URL',
      message:
        error instanceof Error
          ? error.message
          : `Invalid URL: Unable to resolve "${url}"`,
      cause: error,
    });
  }

  // Convenience methods with JSON defaults.

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
  async head<T = null, E = unknown>(
    url: string,
    params?: QueryParams,
    options?: RequestOptions,
  ): Promise<FetchResponse<T, E>> {
    let finalUrl: string;
    try {
      finalUrl = this.buildUrlWithParams(url, params);
    } catch (error) {
      return this.urlFailureResponse<T, E>(url, error);
    }

    return this.request<T, E>(finalUrl, { method: 'HEAD' }, options);
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
    params?: QueryParams,
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
  async get<T = unknown, E = unknown>(
    url: string,
    params?: QueryParams,
    options?: RequestOptions,
  ): Promise<FetchResponse<T, E>> {
    let finalUrl: string;
    try {
      finalUrl = this.buildUrlWithParams(url, params);
    } catch (error) {
      return this.urlFailureResponse<T, E>(url, error);
    }

    return this.request<T, E>(finalUrl, { method: 'GET' }, options);
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
  post<T = unknown, E = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: RequestOptions,
  ): Promise<FetchResponse<T, E>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    return this.request<T, E>(
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
  put<T = unknown, E = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: RequestOptions,
  ): Promise<FetchResponse<T, E>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    return this.request<T, E>(
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
  patch<T = unknown, E = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
    options?: RequestOptions,
  ): Promise<FetchResponse<T, E>> {
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    return this.request<T, E>(
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
  async del<T = unknown, E = unknown>(
    url: string,
    params?: QueryParams,
    options?: RequestOptions,
  ): Promise<FetchResponse<T, E>> {
    let finalUrl: string;
    try {
      finalUrl = this.buildUrlWithParams(url, params);
    } catch (error) {
      return this.urlFailureResponse<T, E>(url, error);
    }

    return this.request<T, E>(finalUrl, { method: 'DELETE' }, options);
  }
}

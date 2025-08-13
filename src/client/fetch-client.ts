/**
 * @fileoverview FetchClient implementation.
 *
 * This file contains the main FetchClient class which provides a configurable
 * HTTP client with middleware support, content-type aware response parsing,
 * and standard REST methods (GET, POST, PUT, PATCH, DELETE).
 */

import type {
  RequestMiddleware,
  ResponseMiddleware,
  FetchResponse,
  FetchClientOptions,
} from './types';

/**
 * A configurable HTTP client with middleware support.
 *
 * @example
 * ```typescript
 * const client = new FetchClient({
 *   credentials: 'same-origin'
 * });
 *
 * // Add middleware
 * client.useRequestMiddleware(async (req, url) => {
 *   return [{ ...req, headers: { ...req.headers, 'Auth': 'token' } }, url];
 * });
 *
 * // Make requests
 * const data = await client.get('/api/users');
 * ```
 */
export class FetchClient {
  private requestMiddlewares: RequestMiddleware[] = [];
  private responseMiddlewares: ResponseMiddleware[] = [];
  private credentials: RequestCredentials;

  /**
   * Creates a new FetchClient instance.
   * @param config - Configuration options for the client
   */
  constructor(config: FetchClientOptions = {}) {
    this.credentials = config.credentials ?? 'same-origin';
  }

  /**
   * Adds a request middleware to the client.
   * Request middlewares are executed in the order they are added.
   * @param middleware - The middleware function to add
   */
  public useRequestMiddleware(middleware: RequestMiddleware) {
    this.requestMiddlewares.push(middleware);
  }

  /**
   * Adds a response middleware to the client.
   * Response middlewares are executed in the order they are added.
   * @param middleware - The middleware function to add
   */
  public useResponseMiddleware(middleware: ResponseMiddleware) {
    this.responseMiddlewares.push(middleware);
  }

  /**
   * Parses the response based on content type.
   * @param res - The response object
   * @returns Promise that resolves to the parsed data
   */
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

    // If no content-type or unknown, check if there's a body
    if (res.body) {
      // Try to parse as text first, then fall back to blob
      const text = await res.text();
      return text || null;
    }

    return null;
  }

  /**
   * Makes an HTTP request with middleware processing.
   *
   * @template T - The expected response type
   * @param url - The URL to request
   * @param init - Request configuration options
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public async request<T = unknown>(
    url: string,
    init: RequestInit = {},
  ): Promise<FetchResponse<T>> {
    try {
      for (const mw of this.requestMiddlewares) {
        [init, url] = await mw(init, url);
      }

      const finalInit = {
        credentials: this.credentials,
        ...init,
      };

      let res = await fetch(url, finalInit);

      // Create a Request object for response middleware
      // Convert relative URLs to absolute URLs for Request constructor
      let absoluteUrl: string;
      try {
        // Try to create URL with global base if available
        const base =
          typeof globalThis !== 'undefined' && globalThis.location
            ? globalThis.location.href
            : 'http://localhost/';
        absoluteUrl = new URL(url, base).href;
      } catch {
        // Fallback to assuming it's already absolute or use default base
        try {
          absoluteUrl = new URL(url, 'http://localhost/').href;
        } catch {
          // Last resort - assume the url is already absolute
          absoluteUrl = url;
        }
      }
      const req = new Request(absoluteUrl, finalInit);

      for (const mw of this.responseMiddlewares) {
        res = await mw(req, res);
      }

      const responseMetadata = {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        url: res.url,
        ok: res.ok,
      };

      if (!res.ok) {
        const body = await this.parseResponse(res).catch(() => ({}));
        return {
          ...responseMetadata,
          data: null as T,
          error: {
            message: res.statusText,
            body,
          },
        };
      }

      const data = await this.parseResponse(res);
      return {
        ...responseMetadata,
        data: data as T,
      };
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          status: 0,
          statusText: 'Network Error',
          headers: new Headers(),
          url,
          ok: false,
          data: null as T,
          error: {
            message: 'Failed to fetch',
            body: error,
          },
        };
      }

      // Re-throw unexpected errors
      throw error;
    }
  }

  /**
   * Makes a GET request.
   * @template T - The expected response type
   * @param url - The URL to request
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public get<T>(url: string): Promise<FetchResponse<T>> {
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * Helper method for requests with JSON body.
   * @template T - The expected response type
   * @param url - The URL to request
   * @param method - The HTTP method
   * @param body - The request body data (will be JSON stringified)
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  private requestWithJsonBody<T>(
    url: string,
    method: 'POST' | 'PUT' | 'PATCH',
    body: unknown,
  ): Promise<FetchResponse<T>> {
    return this.request<T>(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Makes a POST request with JSON body.
   * @template T - The expected response type
   * @param url - The URL to request
   * @param body - The request body data (will be JSON stringified)
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public post<T>(url: string, body?: unknown): Promise<FetchResponse<T>> {
    return this.requestWithJsonBody<T>(url, 'POST', body ?? {});
  }

  /**
   * Makes a PUT request with JSON body.
   * @template T - The expected response type
   * @param url - The URL to request
   * @param body - The request body data (will be JSON stringified)
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public put<T>(url: string, body?: unknown): Promise<FetchResponse<T>> {
    return this.requestWithJsonBody<T>(url, 'PUT', body ?? {});
  }

  /**
   * Makes a PATCH request with JSON body.
   * @template T - The expected response type
   * @param url - The URL to request
   * @param body - The request body data (will be JSON stringified)
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public patch<T>(url: string, body?: unknown): Promise<FetchResponse<T>> {
    return this.requestWithJsonBody<T>(url, 'PATCH', body ?? {});
  }

  /**
   * Makes a DELETE request.
   * @template T - The expected response type
   * @param url - The URL to request
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public delete<T>(url: string): Promise<FetchResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  /**
   * @deprecated Use delete() instead
   * Makes a DELETE request.
   * @template T - The expected response type
   * @param url - The URL to request
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public del<T>(url: string): Promise<FetchResponse<T>> {
    return this.delete<T>(url);
  }
}

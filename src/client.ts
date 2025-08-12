import { HttpError, NetworkError } from './errors';

/**
 * Middleware function that processes requests before they are sent.
 * Can modify request options and URL.
 * @param req - The request configuration object
 * @param url - The request URL
 * @returns A promise that resolves to a tuple of [modified request, modified URL]
 */
export type RequestMiddleware = (
  req: RequestInit,
  url: string,
) => Promise<[RequestInit, string]>;

/**
 * Middleware function that processes responses after they are received.
 * Can modify or replace the response.
 * @param res - The response object
 * @returns A promise that resolves to the modified response
 */
export type ResponseMiddleware = (res: Response) => Promise<Response>;

/**
 * Configuration options for FetchClient.
 */
export interface FetchClientConfig {
  /** Controls whether credentials are sent with requests. Defaults to 'same-origin'. */
  credentials?: RequestCredentials; // 'omit' | 'same-origin' | 'include'
}

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
  constructor(config: FetchClientConfig = {}) {
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
   * Makes an HTTP request with middleware processing.
   *
   * @template T - The expected response type
   * @param url - The URL to request
   * @param init - Request configuration options
   * @returns Promise that resolves to the parsed JSON response
   * @throws The error object from the response if the request fails
   */
  public async request<T = any>(
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    try {
      for (const mw of this.requestMiddlewares) {
        [init, url] = await mw(init, url);
      }

      let res = await fetch(url, {
        credentials: this.credentials,
        ...init,
      });

      for (const mw of this.responseMiddlewares) {
        res = await mw(res);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new HttpError(res.status, res.statusText, body, url);
      }

      return res.json();
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Failed to fetch', url, error);
      }
      throw error;
    }
  }

  /**
   * Makes a GET request.
   * @template T - The expected response type
   * @param url - The URL to request
   * @returns Promise that resolves to the parsed JSON response
   */
  public get<T>(url: string) {
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * Helper method for requests with JSON body.
   * @template T - The expected response type
   * @param url - The URL to request
   * @param method - The HTTP method
   * @param body - The request body data (will be JSON stringified)
   * @returns Promise that resolves to the parsed JSON response
   */
  private requestWithJsonBody<T>(
    url: string,
    method: 'POST' | 'PUT',
    body: any,
  ): Promise<T> {
    return this.request<T>(url, {
      method,
      body: JSON.stringify(body),
    });
  }

  /**
   * Makes a POST request with JSON body.
   * @template T - The expected response type
   * @param url - The URL to request
   * @param body - The request body data (will be JSON stringified)
   * @returns Promise that resolves to the parsed JSON response
   */
  public post<T>(url: string, body?: any) {
    return this.requestWithJsonBody<T>(url, 'POST', body ?? {});
  }

  /**
   * Makes a PUT request with JSON body.
   * @template T - The expected response type
   * @param url - The URL to request
   * @param body - The request body data (will be JSON stringified)
   * @returns Promise that resolves to the parsed JSON response
   */
  public put<T>(url: string, body?: any) {
    return this.requestWithJsonBody<T>(url, 'PUT', body ?? {});
  }

  /**
   * Makes a DELETE request.
   * @template T - The expected response type
   * @param url - The URL to request
   * @returns Promise that resolves to the parsed JSON response
   */
  public del<T>(url: string) {
    return this.request<T>(url, { method: 'DELETE' });
  }
}

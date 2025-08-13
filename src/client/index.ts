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
 * Typed response wrapper that includes response metadata.
 * @template T - The type of the response data
 */
export interface FetchResponse<T> {
  /** The parsed response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** HTTP status text */
  statusText: string;
  /** Response headers */
  headers: Headers;
  /** The original URL */
  url: string;
  /** Whether the response was successful (status 200-299) */
  ok: boolean;
  /** Error information if the request failed */
  error?: {
    message: string;
    body?: unknown;
  };
}

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

      let res = await fetch(url, {
        credentials: this.credentials,
        ...init,
      });

      for (const mw of this.responseMiddlewares) {
        res = await mw(res);
      }

      const responseMetadata = {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
        url: res.url,
        ok: res.ok,
      };

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ...responseMetadata,
          data: null as T,
          error: {
            message: res.statusText,
            body,
          },
        };
      }

      const data = await res.json();
      return {
        ...responseMetadata,
        data,
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
    method: 'POST' | 'PUT',
    body: unknown,
  ): Promise<FetchResponse<T>> {
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
   * Makes a DELETE request.
   * @template T - The expected response type
   * @param url - The URL to request
   * @returns Promise that resolves to a FetchResponse containing the data and metadata
   */
  public del<T>(url: string): Promise<FetchResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' });
  }
}

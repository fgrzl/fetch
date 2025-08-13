/**
 * @fileoverview Type definitions for the HTTP client module.
 *
 * This file contains all TypeScript interfaces and types used by the FetchClient,
 * including middleware function types, response interfaces, and configuration options.
 */

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
 * Can modify or replace the response, with access to the original request.
 * @param req - The original request object
 * @param res - The response object
 * @returns A promise that resolves to the modified response
 */
export type ResponseMiddleware = (
  req: Request,
  res: Response,
) => Promise<Response>;

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
export interface FetchClientOptions {
  /** Controls whether credentials are sent with requests. Defaults to 'same-origin'. */
  credentials?: RequestCredentials; // 'omit' | 'same-origin' | 'include'
}

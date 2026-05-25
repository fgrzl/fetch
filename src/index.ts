/**
 * @fileoverview Core public API for the response-object fetch client.
 *
 * Optional middleware is available from `@fgrzl/fetch/middleware` and its
 * focused subpath exports.
 */

export { FetchClient } from './client/fetch-client';
export {
  FetchError,
  HttpError,
  NetworkError,
  errorFromResponse,
  throwOnError,
} from './errors';
export { appendQueryParams, buildQueryParams } from './client/query';

export type { FetchMiddleware as InterceptMiddleware } from './client/fetch-client';
export type {
  FetchClientOptions,
  FetchFailureResponse,
  FetchResponse,
  FetchResponseError,
  FetchSuccessResponse,
  RequestOptions,
} from './client/types';
export type { QueryParams, QueryValue } from './client/query';

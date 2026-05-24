/**
 * @fileoverview Authorization response-handler middleware types.
 */

import type { FetchResponse } from '../../client/types';

/**
 * Handler invoked for a configured authorization response.
 */
export type UnauthorizedHandler = (
  response: FetchResponse<unknown>,
  request: RequestInit & { url?: string },
) => void | Promise<void>;

/**
 * Configuration for authorization response handling.
 *
 * This middleware has no navigation or storage behavior of its own. Consumers
 * explicitly provide handlers for the responses that matter to their app.
 */
export interface AuthorizationOptions {
  /**
   * Handler called for a `401 Unauthorized` response or for another
   * configured status without a dedicated handler.
   */
  onUnauthorized?: UnauthorizedHandler;

  /**
   * Handler called for a configured `403 Forbidden` response.
   */
  onForbidden?: UnauthorizedHandler;

  /**
   * Skip handling for request URLs matching any pattern.
   */
  skipPatterns?: (RegExp | string)[];

  /**
   * Status codes to handle. Defaults to `[401]`.
   */
  statusCodes?: number[];
}

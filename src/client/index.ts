/**
 * @fileoverview Client module barrel exports.
 *
 * This module provides a configurable HTTP client with middleware support.
 * It acts as the main entry point for the client functionality, re-exporting
 * all public APIs from the types and client implementation files.
 */

// Export types
export type {
  RequestMiddleware,
  ResponseMiddleware,
  FetchResponse,
  FetchClientOptions as FetchClientConfig,
} from './types';

// Export client class
export { FetchClient } from './client';

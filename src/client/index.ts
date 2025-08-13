/**
 * @fileoverview Client module exports - "Pit of Success" pattern.
 *
 * This module exports client functionality in order of discoverability:
 * 1. FetchClient class (main thing users need)
 * 2. Types for TypeScript users (auto-discovered via IntelliSense)
 */

// 🎯 LEVEL 1: Main client class (what users need most)
export { FetchClient } from './fetch-client';

// 🎯 LEVEL 2: Types for TypeScript users (discovered when needed)
export type {
  RequestMiddleware,
  ResponseMiddleware,
  FetchResponse,
  FetchClientOptions as FetchClientConfig,
} from './types';

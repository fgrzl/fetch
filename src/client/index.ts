/**
 * @fileoverview Client module exports - "Pit of Success" design.
 *
 * This module provides a clean, discoverable API:
 * 🎯 Level 1: FetchClient class (what 90% of users need)
 * 🎯 Level 2: Types for TypeScript users (auto-discovered via IntelliSense)
 * 🎯 Level 3: Utilities for advanced use cases
 */

// 🎯 LEVEL 1: Main client class - the "pit of success" entry point
export { FetchClient } from './fetch-client';

// 🎯 LEVEL 2: Types for TypeScript users (discovered when needed)
export type { FetchMiddleware } from './fetch-client';
export type { FetchResponse, FetchClientOptions } from './types';

// 🎯 LEVEL 3: Utilities for advanced use cases
export { buildQueryParams, appendQueryParams } from './query';
export type { QueryParams, QueryValue } from './query';

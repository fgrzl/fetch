/**
 * @fileoverview Middleware exports - "Pit of Success" pattern.
 * 
 * This module provides pre-built middleware functions for common HTTP client needs.
 * Each middleware follows the same "pit of success" pattern:
 * 
 * 🎯 LEVEL 1: use{Middleware}(client) - Just works with smart defaults
 * 🎯 LEVEL 2: use{Middleware}(client, config) - Customizable when needed
 * 
 * Available middleware:
 * - useCSRF(client, config?) - CSRF protection (XSRF-TOKEN standard)
 * - useAuthorization(client, config?) - 401 redirect handling (/login default)
 * - useRetry(client, config?) - Automatic retries (3x exponential backoff)
 */

// 🎯 Re-export clean public APIs from each middleware module
export * from './CSRF';
export * from './authorization';
export * from './retry';

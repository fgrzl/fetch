// @vitest-environment node

import { bench, describe, vi } from 'vite-plus/test';
import { FetchClient, type FetchMiddleware } from '../src/client/fetch-client';
import type { FetchResponse } from '../src/client/types';
import {
  addAuthentication,
  addCache,
  addLogging,
  addRateLimit,
  addRetry,
} from '../src/middleware';

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const jsonResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
globalThis.fetch = mockFetch;

const postBody = {
  email: 'ada@example.com',
  name: 'Ada Lovelace',
};

const baselineClient = new FetchClient();

const authClient = new FetchClient();
addAuthentication(authClient, { tokenProvider: () => 'benchmark-token' });

const cacheClient = new FetchClient();
addCache(cacheClient, { ttl: 60_000 });
await cacheClient.get('/cached-user', { id: 1 });
mockFetch.mockClear();

const retryClient = new FetchClient();
addRetry(retryClient, { maxRetries: 0 });

const rateLimitClient = new FetchClient();
addRateLimit(rateLimitClient, {
  maxRequests: 1_000_000,
  windowMs: 60_000,
});

const loggingClient = new FetchClient();
addLogging(loggingClient, { level: 'info', logger: noopLogger });

const stackClient = new FetchClient();
addAuthentication(stackClient, { tokenProvider: () => 'benchmark-token' });
addCache(stackClient, { ttl: 60_000 });
addRetry(stackClient, { maxRetries: 0 });
addRateLimit(stackClient, { maxRequests: 1_000_000, windowMs: 60_000 });
addLogging(stackClient, { level: 'info', logger: noopLogger });

const terminalResponse: FetchResponse<unknown> = {
  data: { ok: true },
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  url: '/users',
  ok: true,
  error: null,
};
const terminal: FetchMiddleware = async () => terminalResponse;

const shortCircuitBaseline = new FetchClient().use(terminal);

const shortCircuitAuth = new FetchClient();
addAuthentication(shortCircuitAuth, { tokenProvider: () => 'benchmark-token' });
shortCircuitAuth.use(terminal);

const shortCircuitCache = new FetchClient();
addCache(shortCircuitCache, { ttl: 60_000 });
shortCircuitCache.use(terminal);

const shortCircuitRetry = new FetchClient();
addRetry(shortCircuitRetry, { maxRetries: 0 });
shortCircuitRetry.use(terminal);

const shortCircuitRateLimit = new FetchClient();
addRateLimit(shortCircuitRateLimit, {
  maxRequests: 10_000_000,
  windowMs: 60_000,
});
shortCircuitRateLimit.use(terminal);

const shortCircuitLogging = new FetchClient();
addLogging(shortCircuitLogging, { level: 'info', logger: noopLogger });
shortCircuitLogging.use(terminal);

const shortCircuitStack = new FetchClient();
addAuthentication(shortCircuitStack, {
  tokenProvider: () => 'benchmark-token',
});
addCache(shortCircuitStack, { ttl: 60_000 });
addRetry(shortCircuitStack, { maxRetries: 0 });
addRateLimit(shortCircuitStack, {
  maxRequests: 10_000_000,
  windowMs: 60_000,
});
addLogging(shortCircuitStack, { level: 'info', logger: noopLogger });
shortCircuitStack.use(terminal);

describe('attribution: middleware stack overhead', () => {
  bench('posts without middleware', async () => {
    await baselineClient.post('/users', postBody);
  });

  bench('posts with authentication', async () => {
    await authClient.post('/users', postBody);
  });

  bench('posts through cache bypass', async () => {
    await cacheClient.post('/users', postBody);
  });

  bench('posts with retry disabled', async () => {
    await retryClient.post('/users', postBody);
  });

  bench('posts with rate limiting', async () => {
    await rateLimitClient.post('/users', postBody);
  });

  bench('posts with logging', async () => {
    await loggingClient.post('/users', postBody);
  });

  bench('serves warm GET responses from the cache middleware', async () => {
    await cacheClient.get('/cached-user', { id: 1 });
  });

  bench('passes POST through auth/cache/retry/rate-limit/logging', async () => {
    await stackClient.post('/users', postBody);
  });
});

describe('attribution: middleware plumbing without fetch parsing', () => {
  bench('posts through terminal middleware only', async () => {
    await shortCircuitBaseline.post('/users', postBody);
  });

  bench('posts through authentication and terminal', async () => {
    await shortCircuitAuth.post('/users', postBody);
  });

  bench('posts through cache bypass and terminal', async () => {
    await shortCircuitCache.post('/users', postBody);
  });

  bench('posts through retry and terminal', async () => {
    await shortCircuitRetry.post('/users', postBody);
  });

  bench('posts through rate-limit and terminal', async () => {
    await shortCircuitRateLimit.post('/users', postBody);
  });

  bench('posts through logging and terminal', async () => {
    await shortCircuitLogging.post('/users', postBody);
  });

  bench('posts through the full stack and terminal', async () => {
    await shortCircuitStack.post('/users', postBody);
  });
});

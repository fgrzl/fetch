import { bench, describe, vi } from 'vite-plus/test';
import { FetchClient } from '../src/client/fetch-client';
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

describe('middleware stack overhead', () => {
  const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
  globalThis.fetch = mockFetch;

  const client = new FetchClient({ baseUrl: 'https://api.example.com' });
  addAuthentication(client, { tokenProvider: () => 'benchmark-token' });
  addCache(client, { ttl: 60_000 });
  addRetry(client, { maxRetries: 0 });
  addRateLimit(client, { maxRequests: 1_000_000, windowMs: 60_000 });
  addLogging(client, { level: 'info', logger: noopLogger });

  bench('passes POST through auth/cache/retry/rate-limit/logging', async () => {
    await client.post('/users', {
      email: 'ada@example.com',
      name: 'Ada Lovelace',
    });
  });

  bench('serves warm GET responses from the cache middleware', async () => {
    await client.get('/cached-user', { id: 1 });
  });
});

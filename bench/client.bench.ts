import { bench, describe, vi } from 'vite-plus/test';
import { appendQueryParams, buildQueryParams } from '../src/client/query';
import { FetchClient } from '../src/client/fetch-client';

const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

describe('query utilities', () => {
  bench('builds scalar and array query parameters', () => {
    buildQueryParams({
      active: true,
      limit: 50,
      offset: 100,
      search: 'http client',
      tags: ['fetch', 'middleware', 'typescript'],
      empty: null,
      skipped: undefined,
    });
  });

  bench('appends query parameters to an existing URL', () => {
    appendQueryParams('/api/users?sort=name#team', {
      active: true,
      limit: 25,
      tag: ['admin', 'editor'],
    });
  });
});

describe('FetchClient request paths', () => {
  const mockFetch = vi.fn(() => Promise.resolve(jsonResponse({ ok: true })));
  globalThis.fetch = mockFetch;

  bench('resolves base URL GET requests with query parameters', async () => {
    const client = new FetchClient({ baseUrl: 'https://api.example.com' });

    await client.get('/users', {
      active: true,
      page: 2,
      search: 'Ada Lovelace',
    });
  });

  bench('serializes JSON POST requests', async () => {
    const client = new FetchClient({ baseUrl: 'https://api.example.com' });

    await client.post('/users', {
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      roles: ['admin', 'maintainer'],
    });
  });

  bench('parses text responses', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('plain text response', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    );

    const client = new FetchClient({ baseUrl: 'https://api.example.com' });
    await client.get('/text');
  });
});

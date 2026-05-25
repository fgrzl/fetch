// @vitest-environment node

import { bench, describe, vi } from 'vite-plus/test';
import { appendQueryParams, buildQueryParams } from '../src/client/query';
import { FetchClient } from '../src/client/fetch-client';

const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

describe('attribution: query utilities', () => {
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

describe('attribution: FetchClient request paths', () => {
  const mockFetch = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    return Promise.resolve(
      url === '/text'
        ? new Response('plain text response', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
          })
        : jsonResponse({ ok: true }),
    );
  });
  globalThis.fetch = mockFetch;

  const relativeClient = new FetchClient();
  const baseUrlClient = new FetchClient({ baseUrl: 'https://api.example.com' });
  const postBody = {
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    roles: ['admin', 'maintainer'],
  };

  bench('FetchClient parses a JSON GET response', async () => {
    await relativeClient.get('/users');
  });

  bench('resolves base URL GET requests without query parameters', async () => {
    await baseUrlClient.get('/users');
  });

  bench('resolves base URL GET requests with query parameters', async () => {
    await baseUrlClient.get('/users', {
      active: true,
      page: 2,
      search: 'Ada Lovelace',
    });
  });

  bench('FetchClient serializes a JSON POST and parses its response', async () => {
    await relativeClient.post('/users', postBody);
  });

  bench('FetchClient parses a text response', async () => {
    await relativeClient.get('/text');
  });
});

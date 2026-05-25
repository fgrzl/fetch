// @vitest-environment node

import { bench, describe, vi } from 'vite-plus/test';
import { FetchClient } from '../src/client/fetch-client';
import { addCache } from '../src/middleware/cache';

type Payload = boolean | { items: Array<Record<string, unknown>> };

function createNestedPayload(itemCount: number): Payload {
  return {
    items: Array.from({ length: itemCount }, (_, index) => ({
      id: index,
      enabled: index % 2 === 0,
      labels: [`group-${index % 5}`, 'cached', 'benchmark'],
      profile: {
        name: `record-${index}`,
        value: 'x'.repeat(176),
      },
    })),
  };
}

const payloads = {
  primitive: true,
  oneKilobyte: createNestedPayload(4),
  fiftyKilobytes: createNestedPayload(200),
} satisfies Record<string, Payload>;

const paths = {
  primitive: '/cache/primitive',
  oneKilobyte: '/cache/one-kilobyte',
  fiftyKilobytes: '/cache/fifty-kilobytes',
} as const;

const payloadByPath = new Map<string, Payload>([
  [paths.primitive, payloads.primitive],
  [paths.oneKilobyte, payloads.oneKilobyte],
  [paths.fiftyKilobytes, payloads.fiftyKilobytes],
]);

function responseFor(data: Payload): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const mockFetch = vi.fn((input: RequestInfo | URL) => {
  const path =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.pathname
        : new URL(input.url).pathname;
  const payload = payloadByPath.get(path);

  if (payload === undefined) {
    throw new Error(`Missing benchmark payload for ${path}`);
  }

  return Promise.resolve(responseFor(payload));
});
globalThis.fetch = mockFetch;

function cachedClient(): FetchClient {
  return addCache(new FetchClient(), { ttl: 60_000 });
}

const primitiveClient = cachedClient();
const oneKilobyteClient = cachedClient();
const fiftyKilobytesClient = cachedClient();
const oneKilobyteImmutableClient = addCache(new FetchClient(), {
  ttl: 60_000,
  cloneData: false,
});
const fiftyKilobytesImmutableClient = addCache(new FetchClient(), {
  ttl: 60_000,
  cloneData: false,
});

await primitiveClient.get(paths.primitive);
await oneKilobyteClient.get(paths.oneKilobyte);
await fiftyKilobytesClient.get(paths.fiftyKilobytes);
await oneKilobyteImmutableClient.get(paths.oneKilobyte);
await fiftyKilobytesImmutableClient.get(paths.fiftyKilobytes);
mockFetch.mockClear();

describe('attribution: warm cache hit payload scaling', () => {
  bench('serves a primitive response', async () => {
    await primitiveClient.get(paths.primitive);
  });

  bench('serves an approximately 1 KB nested response', async () => {
    await oneKilobyteClient.get(paths.oneKilobyte);
  });

  bench('serves an approximately 50 KB nested response', async () => {
    await fiftyKilobytesClient.get(paths.fiftyKilobytes);
  });

  bench('serves an immutable approximately 1 KB response without cloning', async () => {
    await oneKilobyteImmutableClient.get(paths.oneKilobyte);
  });

  bench('serves an immutable approximately 50 KB response without cloning', async () => {
    await fiftyKilobytesImmutableClient.get(paths.fiftyKilobytes);
  });
});

describe('attribution: cached payload isolation cost', () => {
  bench('clones an approximately 1 KB nested response', () => {
    structuredClone(payloads.oneKilobyte);
  });

  bench('clones an approximately 50 KB nested response', () => {
    structuredClone(payloads.fiftyKilobytes);
  });
});

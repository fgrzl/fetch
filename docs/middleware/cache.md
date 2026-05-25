# Cache Middleware

The cache middleware provides opt-in TTL response memoization. It is not a full HTTP cache.

Use it for repeated safe reads where short-lived staleness is acceptable. Prefer browser cache, service workers, server cache headers, CDN policy, or app data tools for correctness-heavy caching.

## Usage

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addCache } from '@fgrzl/fetch/middleware/cache';

const client = addCache(new FetchClient(), {
  ttl: 5 * 60 * 1000,
});

const first = await client.get('/users');
const second = await client.get('/users'); // served from cache while fresh
```

## Options

```ts
interface CacheOptions {
  ttl?: number;
  storage?: CacheStorage;
  keyGenerator?: CacheKeyGenerator;
  skipPatterns?: (RegExp | string)[];
  staleWhileRevalidate?: boolean;
  cloneData?: boolean;
}
```

- `ttl`: time to keep entries, in milliseconds. Default is 5 minutes.
- Only successful `GET` responses are memoized.
- `storage`: async storage adapter. Default is in-memory storage.
- `keyGenerator`: custom cache key function.
- `skipPatterns`: URL patterns that bypass memoization.
- `staleWhileRevalidate`: return stale data while refreshing it in the background.
- `cloneData`: clone data on cache writes and reads so mutations do not leak between responses. Defaults to `true`; set to `false` only for immutable payloads when large-response cache-hit throughput matters.

By default, modifying one returned response cannot modify later cache hits. For read-only large payloads, cloning can outweigh the rest of a warm cache lookup:

```ts
const immutableClient = addCache(new FetchClient(), {
  ttl: 30_000,
  cloneData: false,
});
```

## Custom Storage

```ts
import type { CacheEntry, CacheStorage } from '@fgrzl/fetch/middleware/cache';

class LocalStorageCache implements CacheStorage {
  async get(key: string): Promise<CacheEntry | null> {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    localStorage.setItem(key, JSON.stringify(entry));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    localStorage.clear();
  }
}
```

## Limits

- No automatic invalidation after mutations.
- No `Cache-Control` parsing or HTTP cache semantics.
- No built-in max-size eviction.
- No distributed coordination.
- No streaming response support.
- Be careful caching authenticated responses; include auth-relevant headers in the cache key if needed.

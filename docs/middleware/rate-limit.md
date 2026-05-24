# Rate Limit Middleware

The rate-limit middleware is an in-memory token bucket. It is useful for pacing bulk work or respecting a provider quota within one configured client.

Server enforcement, distributed quotas, and durable accounting belong outside this package.

## Usage

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addRateLimit } from '@fgrzl/fetch/middleware/rate-limit';

const client = addRateLimit(new FetchClient(), {
  maxRequests: 100,
  windowMs: 60 * 1000,
});
```

## Options

```ts
interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (request: RequestInit & { url?: string }) => string;
  skipPatterns?: (RegExp | string)[];
  onRateLimitExceeded?: (
    retryAfter: number,
    request: RequestInit & { url?: string },
  ) =>
    | void
    | Promise<void>
    | FetchResponse<unknown>
    | Promise<FetchResponse<unknown>>;
}
```

The defaults are `60` requests per `60000` milliseconds in one shared token bucket.

When combining this middleware with retry, order determines accounting. Add the rate limiter before retry to count one logical request; add retry first to count each attempted network call.

## Rate-Limited Responses

When the bucket is empty, the middleware returns a failed `429` response:

```ts
const response = await client.get('/bulk-item');

if (!response.ok && response.status === 429) {
  console.log(response.headers.get('Retry-After'));
}
```

## Limits

- Buckets are memory-only and per middleware instance.
- Pacing is token-bucket behavior only.
- Distributed or persistent quotas are out of scope.

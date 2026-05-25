# Troubleshooting

## Import Problems

Use the root export for the client and response contract:

```ts
import { FetchClient, throwOnError } from '@fgrzl/fetch';
```

Import optional middleware from its subpath:

```ts
import { addRetry } from '@fgrzl/fetch/middleware/retry';
```

## Requests Return `ok: false`

Requests do not throw by default. Inspect the response:

```ts
const api = new FetchClient();
const response = await api.get('/health');

if (!response.ok) {
  console.log(response.status, response.statusText, response.error.message);
}
```

Use `throwOnError` only when you want exceptions at a specific call site.

## Invalid Base URL

Base URLs need a protocol:

```ts
import { FetchClient } from '@fgrzl/fetch';

new FetchClient({ baseUrl: 'https://api.example.com' }); // good
new FetchClient({ baseUrl: 'api.example.com' }); // returns Invalid URL failures
```

Invalid URL resolution returns `status: 0` and `statusText: 'Invalid URL'`.

## Missing Auth Header

Check the token provider and option names:

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';

const client = new FetchClient();

addAuthentication(client, {
  tokenProvider: () => localStorage.getItem('token') || '',
  tokenType: 'Bearer',
  headerName: 'Authorization',
});
```

Use `requireToken: true` if a missing token should produce a local `401` response instead of sending the request.

## CSRF Token Not Sent

CSRF only applies to protected methods by default: `POST`, `PUT`, `PATCH`, and `DELETE`.

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addCSRF } from '@fgrzl/fetch/middleware/csrf';

const client = new FetchClient();

addCSRF(client, {
  tokenProvider: () =>
    document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content') || '',
});
```

## Rate Limited Locally

The rate-limit middleware returns a `429` response:

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();
const response = await client.get('/api/test');

if (!response.ok && response.status === 429) {
  console.log(response.headers.get('Retry-After'));
}
```

Configure it with `maxRequests`, `windowMs`, `keyGenerator`, `skipPatterns`, and `onRateLimitExceeded`.

## Cache Looks Stale

The cache middleware is TTL response memoization. It does not implement HTTP cache semantics or automatic invalidation.

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addCache } from '@fgrzl/fetch/middleware/cache';

const client = new FetchClient();

addCache(client, {
  ttl: 30_000,
  skipPatterns: ['/me'],
});
```

Avoid caching authenticated or user-specific responses unless the cache key includes auth-relevant request data.

## CORS

CORS is enforced by the browser and must be configured by the server. The client can only choose credential behavior:

```ts
import { FetchClient } from '@fgrzl/fetch';

new FetchClient({ credentials: 'include' }); // send cross-origin cookies
new FetchClient({ credentials: 'omit' }); // token-only calls
```

## Minimal Reproduction

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });
const response = await client.get('/test');

console.log({
  ok: response.ok,
  status: response.status,
  statusText: response.statusText,
  error: response.ok ? null : response.error,
});
```

[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)

# @fgrzl/fetch

An explicit TypeScript client built on `fetch`, with typed `ok` / `data` / `error` results and opt-in middleware.

## Why Use It

- Requests resolve to typed result objects instead of throwing for HTTP or network failures.
- The core API stays narrow: JSON requests, base URLs, cancellation, timeouts, and tracing headers.
- Middleware is explicit: add auth, retry, caching, logging, CSRF, or local rate limits only where needed.
- Importing the package creates no shared client and enables no behavior behind your back.

`@fgrzl/fetch` is built for applications that want explicit request flow, strong TypeScript narrowing, and modern `fetch` semantics without a large client abstraction sitting in the middle.

## Install

```bash
npm install @fgrzl/fetch
```

## Quick Start

```ts
import { FetchClient } from '@fgrzl/fetch';

const api = new FetchClient({ baseUrl: 'https://api.example.com' });
const res = await api.get<{ id: number; name: string }>('/users/1');

if (res.ok) {
  console.log(res.data.name);
} else {
  console.error(res.status, res.error.message);
}
```

There is no configured global client and no middleware is installed by importing the package.

## Design

- Built on native `fetch`, not a parallel request stack.
- Returns a discriminated response object by default.
- Keeps exceptions opt-in through `throwOnError`.
- Installs middleware per client instance, not globally.
- Favors explicit behavior over hidden defaults and preset stacks.

## Add Middleware

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

const api = new FetchClient({ baseUrl: 'https://api.example.com' });

addAuthentication(api, {
  tokenProvider: () => localStorage.getItem('token') || '',
});

addRetry(api, {
  maxRetries: 2,
  delay: 250,
  backoff: 'exponential',
});
```

Cache support is an opt-in TTL memoizer for safe repeated reads, not a replacement for HTTP cache policy or application data caching.

## Opt Into Exceptions

```ts
import { FetchClient, throwOnError } from '@fgrzl/fetch';

const api = new FetchClient({ baseUrl: 'https://api.example.com' });
const user = throwOnError(await api.get<User>('/users/1'));
```

## Documentation

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Error handling](docs/error-handling.md)
- [Middleware](docs/middleware.md)
- [TypeScript](docs/typescript.md)

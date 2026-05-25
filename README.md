[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)

# @fgrzl/fetch

An explicit TypeScript client built on native `fetch`, with typed `ok` / `data` / `error` responses and opt-in middleware.

## Why It Exists

- Requests resolve to typed result objects instead of throwing for ordinary HTTP failures.
- The core API stays small: JSON requests, base URLs, cancellation, timeouts, and tracing headers.
- Middleware is opt-in: add auth, retry, caching, logging, CSRF, or local rate limits only where a client needs them.
- Importing the package creates no shared client and enables no behavior automatically.

## Install

```bash
npm install @fgrzl/fetch
```

## Quick Start

```ts
import { FetchClient } from '@fgrzl/fetch';

const api = new FetchClient({ baseUrl: 'https://api.example.com' });
const response = await api.get<{ id: number; name: string }>('/users/1');

if (response.ok) {
  console.log(response.data.name);
} else {
  console.error(response.status, response.error.message);
  console.error(response.error.body);
}
```

Use `response.ok` for control flow. Success gives you `response.data`; failure gives structured details in `response.error`.

## Add Middleware

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });

addAuthentication(client, {
  tokenProvider: () => localStorage.getItem('token') || '',
});

addRetry(client, {
  maxRetries: 2,
  delay: 250,
  backoff: 'exponential',
});
```

Each helper mutates and returns the same client. Cache, logging, CSRF, and rate limiting are available the same way when a specific client needs them.

## Optional Exceptions

```ts
import { FetchClient, throwOnError } from '@fgrzl/fetch';

const api = new FetchClient({ baseUrl: 'https://api.example.com' });
const user = throwOnError(
  await api.get<{ id: number; name: string }>('/users/1'),
);

console.log(user.name);
```

Use `throwOnError` only at call sites that expect exceptions.

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Cancellation](docs/cancellation.md)
- [Error handling](docs/error-handling.md)
- [Middleware](docs/middleware.md)
- [Architecture](docs/architecture.md)
- [TypeScript](docs/typescript.md)
- [Troubleshooting](docs/troubleshooting.md)

## Related

- [Docs hub](docs/README.md)
- [CHANGELOG](CHANGELOG.md)
- [CONTRIBUTING](CONTRIBUTING.md)

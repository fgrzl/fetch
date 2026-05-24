# Configuration

`FetchClient` has a small configuration surface.

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({
  baseUrl: 'https://api.example.com',
  credentials: 'same-origin',
  timeout: 5000,
});
```

## Options

```ts
interface FetchClientOptions {
  credentials?: RequestCredentials;
  baseUrl?: string;
  timeout?: number;
}
```

- `credentials`: forwarded to `fetch`; defaults to `same-origin`.
- `baseUrl`: used to resolve relative request URLs.
- `timeout`: default request timeout in milliseconds. Use `0` or omit it for no default timeout.

## Base URL

```ts
const api = new FetchClient({ baseUrl: 'https://api.example.com' });

await api.get('/users'); // https://api.example.com/users
await api.get('users'); // https://api.example.com/users
await api.get('https://cdn.example.com/file.json'); // unchanged
```

`setBaseUrl` updates an existing client:

```ts
api.setBaseUrl('https://staging-api.example.com');
```

Invalid base URL resolution returns a failed response rather than throwing.

## Credentials

```ts
const cookieClient = new FetchClient({ credentials: 'include' });
const tokenOnlyClient = new FetchClient({ credentials: 'omit' });
```

Use `include` for cross-origin cookie flows. Use `omit` for token-only clients that should not send cookies.

## Timeouts

```ts
const client = new FetchClient({ timeout: 10000 });

await client.get('/fast', {}, { timeout: 1000 });
await client.get('/large-report', {}, { timeout: 30000 });
await client.get('/no-timeout', {}, { timeout: 0 });
```

Timeouts return `ok: false`, `status: 0`, and `statusText: 'Request Aborted'`.

## Middleware Configuration

Middleware is configured where it is added:

```ts
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

addAuthentication(client, {
  tokenProvider: () => getToken(),
  tokenType: 'Bearer',
});

addRetry(client, {
  maxRetries: 3,
  delay: 500,
  backoff: 'exponential',
});
```

See [middleware](./middleware.md) for the built-in modules.

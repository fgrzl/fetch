# Configuration

`FetchClient` keeps configuration intentionally small: credentials, base URL, and timeout.

## Client Options

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({
  baseUrl: 'https://api.example.com',
  credentials: 'same-origin',
  timeout: 5000,
});
```

```ts
interface FetchClientOptions {
  credentials?: RequestCredentials;
  baseUrl?: string;
  timeout?: number;
}
```

- `credentials` is forwarded to `fetch`. The default is `same-origin`.
- `baseUrl` resolves relative request URLs.
- `timeout` sets the default request timeout in milliseconds.

## Base URLs

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });

await client.get('/users'); // https://api.example.com/users
await client.get('https://cdn.example.com/file.json'); // unchanged

client.setBaseUrl('https://staging-api.example.com');
await client.get('/users'); // https://staging-api.example.com/users
```

Invalid base URL resolution returns a failed response rather than throwing.

## Credentials

```ts
import { FetchClient } from '@fgrzl/fetch';

const cookieClient = new FetchClient({ credentials: 'include' });
const tokenOnlyClient = new FetchClient({ credentials: 'omit' });
```

Use `include` for cross-origin cookie flows. Use `omit` for token-only clients that should not send cookies.

## Timeouts

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({ timeout: 10000 });

await client.get('/fast', {}, { timeout: 1000 });
await client.get('/large-report', {}, { timeout: 30000 });
await client.get('/no-timeout', {}, { timeout: 0 });
```

Timeouts return `ok: false`, `status: 0`, and `statusText: 'Request Aborted'`.

## Request Overrides

Per-request `signal`, `timeout`, and `operationId` live on `RequestOptions`.

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();

await client.get(
  '/users',
  {},
  {
    signal: new AbortController().signal,
    timeout: 1000,
    operationId: crypto.randomUUID(),
  },
);
```

## Middleware Configuration

Middleware is configured where it is added:

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });
const getToken = () => localStorage.getItem('token') || '';

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

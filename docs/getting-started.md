# Getting Started

`@fgrzl/fetch` is a typed `fetch` client that returns a result object for every request.

## Install

```bash
npm install @fgrzl/fetch
```

## First Request

```ts
import { FetchClient } from '@fgrzl/fetch';

const api = new FetchClient();
const response = await api.get<{ id: number; name: string }>('/api/users/1');

if (response.ok) {
  console.log(response.data.name);
} else {
  console.error(response.status, response.error.message);
}
```

Each client starts with `same-origin` credentials, no base URL, and no middleware.

## Base URLs

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });

await client.get('/users'); // https://api.example.com/users
await client.get('https://cdn.example.com/file.json'); // unchanged
```

Invalid base URL resolution returns `ok: false`, `status: 0`, and `statusText: 'Invalid URL'`.

## JSON Requests

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });

const created = await client.post<{ id: string }>('/users', { name: 'Ava' });

if (created.ok) {
  console.log(created.data.id);
}
```

`post`, `put`, and `patch` serialize provided bodies as JSON and set `Content-Type: application/json` by default.

## Timeouts And Cancellation

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();
const controller = new AbortController();
const pending = client.get(
  '/slow',
  {},
  {
    signal: controller.signal,
    timeout: 5000,
  },
);

controller.abort();

const response = await pending;

if (!response.ok && response.statusText === 'Request Aborted') {
  console.log('The request was cancelled or timed out');
}
```

## Add Middleware

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });

addAuthentication(client, {
  tokenProvider: () => localStorage.getItem('token') || '',
});
addRetry(client, { maxRetries: 2, delay: 250 });
```

Middleware adds to the client execution chain and returns the same client.

## Next Steps

- [Error handling](./error-handling.md)
- [Middleware](./middleware.md)
- [Configuration](./configuration.md)
- [TypeScript](./typescript.md)

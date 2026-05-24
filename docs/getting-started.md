# Getting Started

`@fgrzl/fetch` is a small response-object client on top of standard `fetch`.

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

Each client starts with `same-origin` credentials and no middleware.

## Base URLs

```ts
const client = new FetchClient({ baseUrl: 'https://api.example.com' });

await client.get('/users'); // GET https://api.example.com/users
await client.get('https://cdn.example.com/file.json'); // unchanged
```

Invalid base URL resolution returns a failed response with `status: 0` and `statusText: 'Invalid URL'`.

## JSON Requests

```ts
const created = await client.post<{ id: string }>('/users', { name: 'Ava' });

if (created.ok) {
  console.log(created.data.id);
}
```

`post`, `put`, and `patch` serialize provided bodies as JSON and set `Content-Type: application/json` by default.

## Timeouts And Cancellation

```ts
const controller = new AbortController();
const response = await client.get(
  '/slow',
  {},
  {
    signal: controller.signal,
    timeout: 5000,
  },
);

if (!response.ok && response.statusText === 'Request Aborted') {
  console.log('The request was cancelled or timed out');
}
```

## Add Middleware

```ts
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

addAuthentication(client, {
  tokenProvider: () => localStorage.getItem('token') || '',
});
addRetry(client, { maxRetries: 2, delay: 250 });
```

Middleware modifies the client by adding to its execution chain and returns that same client.

## Next Steps

- [Error handling](./error-handling.md)
- [Middleware](./middleware.md)
- [TypeScript](./typescript.md)

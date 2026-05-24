# Architecture

`@fgrzl/fetch` is built around one narrow contract: every core request resolves to a typed response object.

## Product Shape

- The root export provides `FetchClient`, response types, query helpers, and an explicit `throwOnError` escape hatch.
- HTTP errors, network failures, aborts, parse failures, and invalid URL resolution return `ok: false`.
- Middleware lives behind middleware subpath exports and is installed explicitly per client.
- Importing the package creates no shared client and enables no behavior.

## Response Contract

```ts
import { FetchClient } from '@fgrzl/fetch';

const api = new FetchClient();
const response = await api.get<User>('/users/1');

if (response.ok) {
  response.data; // User
  response.error; // null
} else {
  response.data; // null
  response.error.message; // string
}
```

Failures include `message`, `status`, `statusText`, `url`, optional parsed `body`, and optional `cause`.

## Middleware Pipeline

```txt
request -> middleware 1 -> middleware 2 -> fetch -> middleware 2 -> middleware 1 -> response
```

```ts
client.use(async (request, next) => {
  const headers = new Headers(request.headers);
  headers.set('X-Trace', crypto.randomUUID());

  const response = await next({ ...request, headers });
  if (!response.ok) {
    console.warn(response.error.message);
  }
  return response;
});
```

Middleware can modify requests, observe responses, or short-circuit with a `FetchResponse`. Retry middleware re-runs middleware registered after it for every attempt.

## Optional Middleware

The package includes authentication, authorization response handling, retry, TTL memoization, logging, local rate limiting, and CSRF helpers. Cache is deliberately a small TTL memoizer, not HTTP caching, invalidation, or distributed storage.

## Out Of Scope

- OpenAPI generation and schema validation
- Streaming response helpers
- In-flight request deduplication
- Implicit retries, caching, logging, navigation, or authentication

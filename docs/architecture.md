# Architecture

`@fgrzl/fetch` centers on one narrow contract: every request resolves to a typed response object, not a shared client or a hidden preset stack.

## Public Shape

- The root export provides `FetchClient`, `throwOnError`, query helpers, and response/error types.
- Middleware lives behind middleware subpath exports and is installed explicitly per client.
- Importing the package creates no shared client and enables no behavior automatically.

## Response Contract

```ts
import { FetchClient } from '@fgrzl/fetch';

interface User {
  id: number;
  name: string;
}

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

## Built-in Middleware

- Authentication injects bearer tokens or custom headers.
- Authorization handles selected authentication or authorization failures.
- Retry retries selected transient failures with backoff.
- Cache is a small TTL memoizer for safe repeated reads.
- Logging records request and response details.
- Rate limit applies local token-bucket pacing.
- CSRF injects CSRF tokens for state-changing requests.

## Out Of Scope

- OpenAPI generation and schema validation
- Streaming response helpers
- In-flight request deduplication
- Implicit retries, caching, logging, navigation, or authentication

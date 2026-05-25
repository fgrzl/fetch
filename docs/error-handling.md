# Error Handling

`@fgrzl/fetch` resolves requests to `FetchResponse<T, E>` instead of throwing for ordinary HTTP failures. Use `response.ok` to branch between the success and failure shapes.

## Response Shape

```ts
import { FetchClient } from '@fgrzl/fetch';

interface User {
  id: number;
  name: string;
}

interface ApiError {
  code: string;
  message: string;
}

const api = new FetchClient({ baseUrl: 'https://api.example.com' });
const response = await api.get<User, ApiError>('/users/1');

if (response.ok) {
  response.data; // User
  response.error; // null
} else {
  response.data; // null
  response.error; // structured failure details
}
```

Failed responses expose `message`, `status`, `statusText`, `url`, optional parsed `body`, and optional `cause`.

```ts
interface FetchResponseError<E = unknown> {
  message: string;
  status: number;
  statusText: string;
  url: string;
  body?: E;
  cause?: unknown;
}
```

`status` is `0` for client-side failures such as network errors, aborts, parse failures, and URL resolution failures.

## HTTP Errors

```ts
const response = await api.get<User, { message: string }>('/users/missing');

if (!response.ok && response.status === 404) {
  console.log(response.error.body?.message ?? 'User not found');
}
```

HTTP 4xx and 5xx responses keep the parsed response body in `response.error.body` and set `response.data` to `null`.

## Network, Abort, Parse, And URL Failures

```ts
const response = await api.get('/health', {}, { timeout: 1000 });

if (!response.ok && response.status === 0) {
  console.error(response.statusText, response.error.message);
}
```

Examples of `statusText` values for status `0` failures include `Network Error`, `Request Aborted`, `Invalid URL`, and `Parse Error`.

## Optional Exception Flow

Use `throwOnError` only at call sites that need exceptions.

```ts
import {
  throwOnError,
  FetchError,
  HttpError,
  NetworkError,
} from '@fgrzl/fetch';

try {
  const user = throwOnError(await api.get<User>('/users/1'));
  console.log(user.name);
} catch (error) {
  if (error instanceof HttpError) {
    console.error(error.status, error.body);
  } else if (error instanceof NetworkError) {
    console.error(error.message);
  } else if (error instanceof FetchError) {
    console.error(error.message);
  }
}
```

`throwOnError` returns typed data for success. It throws `HttpError` for non-2xx HTTP responses, `NetworkError` for transport failures, and `FetchError` for abort, URL resolution, or successful-response parsing failures.

## Middleware Error Handling

Middleware should usually return failed responses rather than throw. Throwing is reserved for middleware bugs or application-specific exception flows.

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();
const clearSession = () => sessionStorage.removeItem('session');

client.use(async (request, next) => {
  const response = await next(request);

  if (!response.ok && response.status === 401) {
    clearSession();
  }

  return response;
});
```

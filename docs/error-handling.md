# Error Handling

`@fgrzl/fetch` uses response-based error handling by default. Calls resolve to `FetchResponse<T, E>` instead of throwing for HTTP errors, network failures, aborts, parse failures, or invalid URL resolution.

## Response Branches

```ts
import { FetchClient } from '@fgrzl/fetch';

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

Failed responses include:

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

Examples of `statusText` values for status `0` failures include `Network Error`, `Request Aborted`, and `Invalid URL`.

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
client.use(async (request, next) => {
  const response = await next(request);

  if (!response.ok && response.status === 401) {
    clearSession();
  }

  return response;
});
```

## Testing

```ts
mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

const response = await api.get('/api/test');

expect(response.ok).toBe(false);
expect(response.status).toBe(0);
expect(response.statusText).toBe('Network Error');
```

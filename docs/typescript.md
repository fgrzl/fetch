# TypeScript

`FetchResponse<T, E>` is a discriminated union keyed by `ok`.

## Success And Failure Narrowing

```ts
interface User {
  id: number;
  name: string;
}

interface ApiError {
  code: string;
  message: string;
}

const response = await api.get<User, ApiError>('/users/1');

if (response.ok) {
  response.data.name; // User
  response.error; // null
} else {
  response.data; // null
  response.error.body?.code; // ApiError | undefined
}
```

## Response Types

```ts
import type {
  FetchResponse,
  FetchSuccessResponse,
  FetchFailureResponse,
  FetchResponseError,
} from '@fgrzl/fetch';
```

Use the second generic to type parsed error bodies:

```ts
type UserResponse = FetchResponse<User, ApiError>;
```

## Client And Middleware Types

```ts
import type { FetchClientOptions, InterceptMiddleware } from '@fgrzl/fetch';
import type { AuthenticationOptions } from '@fgrzl/fetch/middleware/authentication';
import type { RetryOptions } from '@fgrzl/fetch/middleware/retry';

const config: FetchClientOptions = {
  baseUrl: 'https://api.example.com',
  credentials: 'same-origin',
  timeout: 5000,
};

const retry: RetryOptions = {
  maxRetries: 3,
  delay: 250,
  backoff: 'exponential',
};
```

## Custom Middleware

```ts
import type { InterceptMiddleware } from '@fgrzl/fetch';

const traceMiddleware: InterceptMiddleware = async (request, next) => {
  const headers = new Headers(request.headers);
  headers.set('X-Trace-Id', crypto.randomUUID());

  return next({ ...request, headers });
};
```

## Optional Exceptions

```ts
import { throwOnError } from '@fgrzl/fetch';

const user: User = throwOnError(await api.get<User>('/users/1'));
```

`throwOnError` keeps response-based calls as the default while supporting integrations that expect exceptions.

## Endpoint Helpers

```ts
class UsersApi {
  constructor(private readonly client = api) {}

  async getUser(id: string): Promise<FetchResponse<User, ApiError>> {
    return this.client.get<User, ApiError>(`/users/${id}`);
  }
}
```

Prefer small endpoint wrappers when you want named operations and shared response types.

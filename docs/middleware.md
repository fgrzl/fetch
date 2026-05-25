# Middleware

Middleware is optional. Add only the behavior a specific client needs.

## Modules

- [Authentication](./middleware/authentication.md): inject bearer tokens or custom auth headers.
- [Authorization](./middleware/authorization.md): handle selected authorization failures.
- [Retry](./middleware/retry.md): retry selected transient failures.
- [Cache](./middleware/cache.md): TTL memoization for safe repeated reads.
- [Logging](./middleware/logging.md): request and response logging.
- [Rate limit](./middleware/rate-limit.md): in-memory token-bucket pacing.
- [CSRF](./middleware/csrf.md): add CSRF tokens to state-changing requests.
- [Custom](./middleware/custom.md): write middleware directly.

## Composition

Order is explicit and observable:

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
import { addLogging } from '@fgrzl/fetch/middleware/logging';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });
const getToken = () => localStorage.getItem('token') || '';

addAuthentication(client, { tokenProvider: () => getToken() });
addRetry(client, { maxRetries: 2, delay: 250 });
addLogging(client, { level: 'error' });
```

Each helper adds middleware to the provided client and returns that client. There are no bundled production presets: the application owns which behavior is active and in what order.

Retry middleware re-runs middleware registered after it on each attempt, so place it where repeated work is acceptable.

## Custom Middleware

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({ baseUrl: 'https://api.example.com' });
const reportError = (error: unknown) => console.error(error);

client.use(async (request, next) => {
  const headers = new Headers(request.headers);
  headers.set('X-Request-Source', 'web');

  const response = await next({ ...request, headers });
  if (!response.ok) {
    reportError(response.error);
  }
  return response;
});
```

Middleware may short-circuit by returning a `FetchResponse` without calling `next`.

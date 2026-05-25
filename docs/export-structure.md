# Export Structure

The root module is the small core API. Optional behaviors use middleware subpaths.

## Root

```ts
import { FetchClient, throwOnError } from '@fgrzl/fetch';
import type { FetchResponse, RequestOptions } from '@fgrzl/fetch';
```

The root module exports the client, result/error helpers, query helpers, and core types. It does not export a client instance or middleware.

## Middleware

```ts
import { addRetry } from '@fgrzl/fetch/middleware/retry';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
```

Available optional entrypoints:

- `@fgrzl/fetch/middleware`
- `@fgrzl/fetch/middleware/authentication`
- `@fgrzl/fetch/middleware/authorization`
- `@fgrzl/fetch/middleware/cache`
- `@fgrzl/fetch/middleware/csrf`
- `@fgrzl/fetch/middleware/logging`
- `@fgrzl/fetch/middleware/rate-limit`
- `@fgrzl/fetch/middleware/retry`

## Errors

```ts
import { throwOnError, HttpError, NetworkError } from '@fgrzl/fetch/errors';
```

Errors are an opt-in exception flow. Core requests return result objects by default.

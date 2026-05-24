# Authorization Middleware

Authorization middleware observes selected failure responses and calls handlers supplied by the application. It never redirects, clears storage, or changes navigation by itself.

## Usage

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthorization } from '@fgrzl/fetch/middleware/authorization';

const client = new FetchClient();

addAuthorization(client, {
  onUnauthorized: () => {
    localStorage.removeItem('auth-token');
    window.location.assign('/login');
  },
});
```

Handle forbidden responses explicitly:

```ts
addAuthorization(client, {
  onUnauthorized: () => showLogin(),
  onForbidden: () => showAccessDenied(),
  statusCodes: [401, 403],
});
```

## Options

```ts
interface AuthorizationOptions {
  onUnauthorized?: UnauthorizedHandler;
  onForbidden?: UnauthorizedHandler;
  skipPatterns?: (RegExp | string)[];
  statusCodes?: number[]; // Default: [401]
}

type UnauthorizedHandler = (
  response: FetchResponse<unknown>,
  request: RequestInit & { url?: string },
) => void | Promise<void>;
```

For a custom status in `statusCodes`, `onUnauthorized` is used unless that status is `403` and `onForbidden` is configured.

## Factory Form

```ts
import { createAuthorizationMiddleware } from '@fgrzl/fetch/middleware/authorization';

client.use(
  createAuthorizationMiddleware({
    onUnauthorized: () => refreshSession(),
    skipPatterns: ['/login', /^\/public\//],
  }),
);
```

Handler exceptions are logged and do not replace the failed response returned by the request.

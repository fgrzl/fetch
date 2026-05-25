# Authentication Middleware

Adds an authentication header to matching requests.

## Usage

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';

const client = addAuthentication(new FetchClient(), {
  tokenProvider: () => localStorage.getItem('auth-token') || '',
});
```

By default, a token is sent as `Authorization: Bearer <token>`.

## Options

```ts
interface AuthenticationOptions {
  tokenProvider: () => string | Promise<string>;
  headerName?: string;
  tokenType?: string;
  skipPatterns?: (RegExp | string)[];
  includePatterns?: (RegExp | string)[];
  requireToken?: boolean;
}
```

- `tokenProvider`: returns the token.
- `headerName`: header to set. Default is `Authorization`.
- `tokenType`: token prefix. Default is `Bearer`.
- `skipPatterns`: paths that should not receive auth.
- `includePatterns`: when provided, only matching paths receive auth.
- `requireToken`: return a synthetic `401` response when no token is available.

## API Key Example

```ts
const client = addAuthentication(new FetchClient(), {
  tokenProvider: () => getApiKey(),
  headerName: 'X-API-Key',
  tokenType: 'ApiKey',
});
```

## Required Token Example

```ts
const client = addAuthentication(new FetchClient(), {
  tokenProvider: () => sessionStorage.getItem('token') || '',
  requireToken: true,
});

const response = await client.get('/private');

if (!response.ok && response.status === 401) {
  showLogin();
}
```

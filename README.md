[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)

# @fgrzl/fetch

A tiny, TypeScript-first wrapper around `fetch` that adds typed responses and composable middleware.

## What
- Lightweight HTTP client built on the browser `fetch` API.
- Returns a consistent response shape (`ok`, `data`, `error`).
- Built-in, optional middleware: auth, retry, cache, logging, CSRF, rate-limit.

## Why
- Removes repetitive request boilerplate (base URLs, headers, retries).
- Keeps runtime small and TypeScript-friendly.
- Compose only the middleware you need — zero-config defaults when useful.

## How
1. Install

```bash
npm install @fgrzl/fetch
```

2. Quick example

```ts
import api from "@fgrzl/fetch";

api.setBaseUrl("https://api.example.com");
const res = await api.get<{ id: number; name: string }>("/users");
if (res.ok) console.log(res.data);
```

## Examples

### Set base URL
```ts
api.setBaseUrl('https://api.example.com');
await api.get('/users');
```

### POST with JSON
```ts
const created = await api.post('/users', { name: 'Ava' });
```

### Typed response
```ts
interface User { id: number; name: string }
const r = await api.get<User>('/me');
if (r.ok) r.data.name;
```

### Add authentication middleware
```ts
import { addAuthentication } from '@fgrzl/fetch/middleware/authentication';
const authed = addAuthentication(api, { tokenProvider: () => localStorage.getItem('token') || '' });
await authed.get('/private');
```

### Cancel / timeout
```ts
const c = new AbortController();
api.get('/data', {}, { signal: c.signal, timeout: 5000 });
c.abort();
```

Docs: `docs/getting-started.md`
## License

MIT

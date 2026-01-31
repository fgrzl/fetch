[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)

# @fgrzl/fetch

**A TypeScript HTTP client wrapper around `fetch` that adds typed responses, middleware, and sane defaults.**

If you’ve ever thought “I just want a small client that makes `fetch` feel production-ready”, this is it.

Use this if you want:

- ✅ Simple, typed HTTP requests that just work
- ✅ A consistent response shape (`ok`, `data`, `error`) instead of `try/catch` everywhere
- ✅ Middleware for auth, retries, caching, logging, CSRF, rate limiting
- ✅ Zero config to start, full control when needed
- ✅ TypeScript-first with zero runtime dependencies

Don't use this if you:

- ❌ Need complex GraphQL support
- ❌ Require advanced request/response transformations

## Quick Start

```bash
npm install @fgrzl/fetch
```

```ts
import api from "@fgrzl/fetch";

// Works immediately
const users = await api.get("https://api.example.com/api/users");

if (users.ok) {
  console.log(users.data);
} else {
  console.error(users.error?.message);
}
```

## Why This Exists

`fetch` is a great low-level primitive, but most apps end up re-implementing the same things:

- Base URLs + query params
- Typed responses
- Retry/backoff
- Caching
- Auth header injection
- Timeouts and cancellation
- Consistent error handling

`@fgrzl/fetch` provides those in a small, composable way.

## Two Ways To Use It

### 1) Default client (recommended)

The default export is a ready-to-use client with a production-friendly middleware stack (retry, cache, logging, rate limiting). Add auth (or anything else) via middleware when you need it.

```ts
import api from "@fgrzl/fetch";

api.setBaseUrl("https://api.example.com");
const users = await api.get("/users");
```

### 2) Custom client

Start with a plain `FetchClient` (no middleware), then add only what you want.

```ts
import { FetchClient } from "@fgrzl/fetch";

const client = new FetchClient({ credentials: "omit" });
const result = await client.get("https://api.example.com/users");
```

## What You Can Do

| Task | How |
| --- | --- |
| Make requests | `api.get()`, `api.post()`, `api.put()`, etc. |
| Type responses | `api.get<User>("/user")` |
| Add auth | `addAuthentication(api, { tokenProvider })` |
| Handle errors | `if (response.ok) { ... } else { ... }` |
| Cancel / timeout | Pass `signal` or `timeout` in request options |
| Add retries / cache / logging | Use the prebuilt middleware or stacks |

## Examples

**Set a base URL:**

```ts
api.setBaseUrl("https://api.example.com");
await api.get("/users"); // GET https://api.example.com/users
```

**Add authentication:**

```ts
import api, { addAuthentication } from "@fgrzl/fetch";

const authedApi = addAuthentication(api, {
  tokenProvider: () => localStorage.getItem("token") || "",
});

// Use the authenticated client
await authedApi.get("/users");
```

**Use with TypeScript:**

```ts
interface User {
  id: number;
  name: string;
}
const response = await api.get<User>("/api/user");
if (response.ok) console.log(response.data.name);
```

**Cancel requests and set timeouts:**

```ts
const controller = new AbortController();
const response = await api.get(
  "/api/data",
  {},
  {
    signal: controller.signal,
    timeout: 5000, // 5 second timeout
  },
);

// Cancel it
controller.abort();
```

## 📚 Documentation

Ready to go deeper? Check out our comprehensive guides:

- **[Getting Started](docs/getting-started.md)** - Installation and basic usage
- **[Configuration](docs/configuration.md)** - Advanced client setup
- **[Middleware](docs/middleware.md)** - Authentication, caching, retries
- **[Cancellation & Timeouts](docs/cancellation.md)** - Abort requests and set timeouts
- **[Error Handling](docs/error-handling.md)** - Robust error management
- **[TypeScript Guide](docs/typescript.md)** - Type-safe API calls
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Contributing](CONTRIBUTING.md)** - Development setup and guidelines

## License

MIT

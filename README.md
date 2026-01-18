[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates)

# @fgrzl/fetch

**A TypeScript HTTP client that works out of the box and grows with you.**

Use this if you want:
- ✅ Simple, typed HTTP requests that just work
- ✅ Built-in CSRF, retries, and error handling
- ✅ Zero config to start, full control when needed
- ✅ TypeScript-first with zero dependencies

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

## What's Included

| Feature | Details |
|---------|---------|
| **Zero Config** | Smart defaults handle CSRF, retries, and errors |
| **Typed** | Full TypeScript support with `api.get<User>()` |
| **Middleware** | Add auth, caching, custom logic when needed |
| **Errors** | Structured error handling, not thrown exceptions |
| **Lightweight** | No dependencies, ~5KB gzipped |

## Examples

**Set a base URL:**
```ts
api.setBaseUrl("https://api.example.com");
await api.get("/users"); // GET https://api.example.com/users
```

**Add authentication:**
```ts
import { FetchClient, addAuthentication } from "@fgrzl/fetch";

const client = addAuthentication(new FetchClient(), {
  tokenProvider: () => localStorage.getItem("token") || "",
});
```

**Use with TypeScript:**
```ts
interface User { id: number; name: string }
const response = await api.get<User>("/api/user");
if (response.ok) console.log(response.data.name);
```

## 📚 Documentation

Ready to go deeper? Check out our comprehensive guides:

- **[Getting Started](docs/getting-started.md)** - Installation and basic usage
- **[Configuration](docs/configuration.md)** - Advanced client setup
- **[Middleware](docs/middleware.md)** - Authentication, caching, retries
- **[Error Handling](docs/error-handling.md)** - Robust error management
- **[TypeScript Guide](docs/typescript.md)** - Type-safe API calls
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

### 🔧 For Maintainers

- **[Release Guide](docs/releases.md)** - How to create releases
- **[Contributing](CONTRIBUTING.md)** - Development setup and guidelines

## 🏗️ Architecture

Built on a **"pit of success"** philosophy where:

- Simple things are simple (`api.get("/path")`)
- Complex things are possible (custom middleware stacks)
- TypeScript guides you to correct usage
- Smart defaults handle 80% of use cases

[Learn more about our architecture →](docs/architecture.md)

## License

MIT

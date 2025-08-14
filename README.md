[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates)

# @fgrzl/fetch

A production-ready HTTP client for TypeScript that **just works** out of the box.

## ✨ Features

- **Pit of Success Design**: Simple defaults that just work, customizable when needed
- Simple API: `api.get('/api/user')`
- Built-in CSRF token support (XSRF-TOKEN standard)
- Smart 401 redirect handling with return URL preservation
- Retry middleware with configurable strategies
- Custom middleware support (request/response)
- TypeScript-first, small and dependency-free

## 📦 Installation

**Install**

```bash
npm install @fgrzl/fetch
```

**Use immediately** - no configuration required:

```ts
import api from "@fgrzl/fetch";

// It just works! 🎉
const users = await api.get("/api/users");
const newUser = await api.post("/api/users", { name: "John" });

// Built-in error handling
if (users.ok) {
  console.log("Users:", users.data);
} else {
  console.error("Error:", users.error?.message);
}
```

**Need custom config?** Add it when you need it:

```ts
import { FetchClient, useAuthentication } from "@fgrzl/fetch";

const authClient = useAuthentication(new FetchClient(), {
  tokenProvider: () => localStorage.getItem("token") || "",
});

// Smart defaults - just works
useCSRF(client);
useAuthorization(client); // Redirects to /login with return URL
useRetry(client);

// All requests now return FetchResponse<T>
interface User {
  id: number;
  name: string;
}
const userResponse = await client.get<User>("/api/user");
if (userResponse.ok) {
  console.log(userResponse.data.name); // Typed access to data
} else {
  console.error(`Failed with status ${userResponse.status}`);
}
```

## ✨ What You Get Out of the Box

- **Zero Configuration** - Works immediately with smart defaults
- **CSRF Protection** - Automatic XSRF-TOKEN handling
- **Retry Logic** - Exponential backoff for failed requests
- **Request Logging** - Built-in observability
- **TypeScript First** - Full type safety and IntelliSense
- **Middleware System** - Composable and extensible

## 📚 Documentation

Ready to go deeper? Check out our comprehensive guides:

- **[Getting Started](docs/getting-started.md)** - Installation and basic usage
- **[Configuration](docs/configuration.md)** - Advanced client setup
- **[Middleware](docs/middleware.md)** - Authentication, caching, retries
- **[Error Handling](docs/error-handling.md)** - Robust error management
- **[TypeScript Guide](docs/typescript.md)** - Type-safe API calls
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

## 🏗️ Architecture

Built on a **"pit of success"** philosophy where:

- Simple things are simple (`api.get("/path")`)
- Complex things are possible (custom middleware stacks)
- TypeScript guides you to correct usage
- Smart defaults handle 80% of use cases

[Learn more about our architecture →](docs/architecture.md)

## License

MIT

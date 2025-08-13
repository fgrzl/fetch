[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates)

# @fgrzl/fetch

A lightweight, middleware-friendly fetch client for TypeScript projects.

## ✨ Features

- Simple API: `api.get('/api/user')`
- Built-in CSRF token support
- Automatic 401 redirect handling
- Custom middleware support (request/response)
- TypeScript-first, small and dependency-free

## 📦 Installation

```bash
npm install @fgrzl/fetch
```

## 🚀 Quick Start

```ts
import api from "@fgrzl/fetch";

const response = await api.get("/api/user");
if (response.ok) {
  console.log(response.data); // Your typed data
} else {
  console.error(`Error ${response.status}:`, response.error?.message);
}
```

Or create a custom instance:

```ts
import { FetchClient, useCSRF, useUnauthorized } from "@fgrzl/fetch";

const client = new FetchClient({
  credentials: "same-origin",
});

useCSRF(client, {
  cookieName: "csrf_token",
  headerName: "X-CSRF-Token",
});

useUnauthorized(client, {
  loginPath: "/login",
});

// All requests now return FetchResponse<T>
interface User { id: number; name: string; }
const userResponse = await client.get<User>("/api/user");
if (userResponse.ok) {
  console.log(userResponse.data.name); // Typed access to data
} else {
  console.error(`Failed with status ${userResponse.status}`);
}
```

---

## Documentation

- [Project Overview](docs/overview.md)
- [Middleware](docs/middleware.md)
- [Error Handling](docs/errors.md)
- [Testing](docs/testing.md)

---

## License

MIT

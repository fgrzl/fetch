[![ci](https://github.com/fgrzl/fetch/actions/workflows/ci.yml/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/fgrzl/fetch/actions/workflows/dependabot/dependabot-updates)

# @fgrzl/fetch

A lightweight, middleware-friendly fetch client for TypeScript projects.

## ✨ Features

- **Pit of Success Design**: Simple defaults that just work, customizable when needed
- Simple API: `api.get('/api/user')`
- Built-in CSRF token support (XSRF-TOKEN standard)
- Smart 401 redirect handling with return URL preservation
- Retry middleware with configurable strategies
- Custom middleware support (request/response)
- TypeScript-first, small and dependency-free

## 📦 Installation

```bash
npm install @fgrzl/fetch
```

## 🚀 Quick Start

**Level 1: Just works with defaults**

```ts
import api from "@fgrzl/fetch";

const response = await api.get("/api/user");
if (response.ok) {
  console.log(response.data); // Your typed data
} else {
  console.error(`Error ${response.status}:`, response.error?.message);
}
```

**Level 2: Custom configuration when needed**

```ts
import { FetchClient, useCSRF, useAuthorization, useRetry } from "@fgrzl/fetch";

const client = new FetchClient({
  credentials: "same-origin",
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

---

## Documentation

- [Project Overview](docs/overview.md)
- [Middleware](docs/middleware.md)
- [Error Handling](docs/errors.md)
- [Testing](docs/testing.md)

---

## License

MIT

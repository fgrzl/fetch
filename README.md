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

const data = await api.get("/api/user");
```

Or create a custom instance:

```ts
import { FetchClient } from "./client";
import { useCSRF } from "./csrf";
import { useUnauthorized } from "./unauthorized";

const api = new FetchClient({
  credentials: "same-origin",
});

useCSRF(api, {
  cookieName: "csrf_token",
  headerName: "X-CSRF-Token",
});

useUnauthorized(api, {
  loginPath: "/login",
});
```

## 🧩 Middleware

Add your own middleware:

```ts
client.useRequestMiddleware(async (req, url) => {
  return [{ ...req, headers: { ...req.headers, "X-Debug": "true" } }, url];
});
```

## 🔐 CSRF + 401 Handling

The default export is pre-configured with:

- `credentials: 'same-origin'`
- CSRF token from `XSRF-TOKEN` cookie
- 401 redirect to `/login?returnTo=...`

## 🧪 Testing

```bash
npm run test
```

## 🛠 Build

```bash
npm run build
```

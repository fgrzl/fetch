# Middleware Overview

This document explains how to use and compose request/response middleware in the fetch client.

## Built-in Middleware

- [Authentication](./middleware/authentication.md) - Add bearer tokens and API keys to requests
- [Authorization](./middleware/authorization.md) - Handle 401/403 responses with smart redirects
- [Cache](./middleware/cache.md) - Response caching with TTL support
- [CSRF Protection](./middleware/csrf.md) - Automatic CSRF token handling
- [Logging](./middleware/logging.md) - Request/response logging for debugging and monitoring
- [Rate Limiting](./middleware/rate-limit.md) - Client-side rate limiting with token bucket
- [Retry](./middleware/retry.md) - Automatic retry with exponential backoff
- [Custom Middleware](./middleware/custom.md) - Create your own middleware

## Pre-built Stacks

The middleware module also provides pre-configured stacks for common use cases:

```ts
import {
  useProductionStack,
  useDevelopmentStack,
  useBasicStack,
} from "@fgrzl/fetch";

// Production: auth + cache + retry + rate limiting + logging
const prodClient = useProductionStack(client, {
  auth: { tokenProvider: () => getToken() },
  cache: { ttl: 5 * 60 * 1000 },
  logging: { level: "info" },
});

// Development: auth + retry + comprehensive logging
const devClient = useDevelopmentStack(client, {
  auth: { tokenProvider: () => "dev-token" },
});

// Basic: just auth + retry
const basicClient = useBasicStack(client, {
  auth: { tokenProvider: () => getToken() },
});

// 💡 Combine with dynamic base URL
const apiClient = useProductionStack(new FetchClient(), {
  auth: { tokenProvider: () => getToken() },
  retry: { maxRetries: 3 },
  logging: { level: "info" },
}).setBaseUrl(process.env.API_BASE_URL!);
```

## Quick Start

```ts
import { FetchClient } from "@fgrzl/fetch";
import {
  useAuthentication,
  useAuthorization,
  useRetry,
  useLogging,
} from "@fgrzl/fetch";

const client = new FetchClient();

// Compose nested middleware for a complete API client
const apiClient = useLogging(
  useRetry(
    useAuthorization(
      useAuthentication(client, {
        tokenProvider: () => localStorage.getItem("token") || "",
      }),
    ),
  ),
  { level: "info" },
);

// Now use the enhanced client
const users = await apiClient.get("/api/users");
```

### Alternative: Step-by-Step Composition

You can also apply middleware step by step for better readability:

```ts
// Step-by-step composition (client is mutated in place)
const client = new FetchClient();
useAuthentication(client, {
  tokenProvider: () => localStorage.getItem("token") || "",
});
useAuthorization(client);
useRetry(client);
useLogging(client, { level: "info" });

// Use the enhanced client
const users = await client.get("/api/users");
```

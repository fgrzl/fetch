# Middleware

This document explains how to use and compose request/response middleware in the fetch client.

## Built-in Middleware

### Authentication

Automatically adds authentication tokens to requests:

```ts
import { useAuthentication } from "@fgrzl/fetch";

const authClient = useAuthentication(client, {
  tokenProvider: () => localStorage.getItem("auth-token") || ""
});

// Custom configuration
const customAuthClient = useAuthentication(client, {
  tokenProvider: async () => {
    // Async token retrieval
    return await getTokenFromSecureStorage();
  },
  authScheme: "ApiKey", // Default: "Bearer"
  headerName: "X-API-Key" // Default: "Authorization"
});
```

### CSRF Protection

Automatically includes CSRF tokens in requests:

```ts
import { useCSRF } from "@fgrzl/fetch";

// Simple usage - reads XSRF-TOKEN cookie, adds X-XSRF-TOKEN header
const csrfClient = useCSRF(client);

// Custom configuration
const customCsrfClient = useCSRF(client, {
  cookieName: "csrf-token",
  headerName: "X-CSRF-Token",
  skipPatterns: ["/api/public/*"]
});
```

### Authorization Handling

Automatically handles 401/403 responses:

```ts
import { useAuthorization } from "@fgrzl/fetch";

const authzClient = useAuthorization(client, {
  onUnauthorized: (response) => {
    // Clear tokens and redirect
    localStorage.removeItem("auth-token");
    window.location.href = "/login";
  },
  onForbidden: (response) => {
    // Handle forbidden access
    showErrorMessage("Access denied");
  },
  statusCodes: [401, 403] // Handle both unauthorized and forbidden
});
```

### Retry

Retries failed requests with configurable strategies:

```ts
import { useRetry } from "@fgrzl/fetch";

// Simple usage with smart defaults
const retryClient = useRetry(client);

// Custom configuration
const customRetryClient = useRetry(client, {
  maxRetries: 3,
  delay: 1000,
  backoff: "exponential", // "fixed" | "linear" | "exponential"
  retryOn: [429, 502, 503, 504], // Which status codes to retry
  onRetry: (attempt, response) => {
    console.log(`Retry attempt ${attempt} for ${response.status}`);
  }
});
```

### Caching

Cache responses to improve performance:

```ts
import { useCache } from "@fgrzl/fetch";

const cachedClient = useCache(client, {
  ttl: 5 * 60 * 1000, // 5 minutes
  methods: ["GET", "HEAD"],
  keyGenerator: (method, url) => `${method}:${url}`,
});

// Custom storage (default is in-memory Map)
const redisCachedClient = useCache(client, {
  ttl: 10 * 60 * 1000,
  storage: new RedisStorage() // Implement CacheStorage interface
});
```

### Logging

Log requests and responses for debugging:

```ts
import { useLogging } from "@fgrzl/fetch";

const loggedClient = useLogging(client, {
  level: "info", // "debug" | "info" | "warn" | "error"
  includeRequestHeaders: false,
  includeResponseHeaders: false,
  includeRequestBody: false,
  includeResponseBody: false,
  logger: console // Custom logger implementation
});
```

### Rate Limiting

Protect APIs from excessive requests:

```ts
import { useRateLimit } from "@fgrzl/fetch";

const limitedClient = useRateLimit(client, {
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 requests per minute
  algorithm: "token-bucket",
  onLimitReached: (retryAfter) => {
    console.log(`Rate limited, retry after ${retryAfter}ms`);
  }
});
```

## Pre-built Middleware Stacks

Instead of configuring individual middleware, you can use pre-built stacks:

### Production Stack

```ts
import { useProductionStack } from "@fgrzl/fetch";

const prodClient = useProductionStack(new FetchClient(), {
  auth: {
    tokenProvider: () => getAuthToken()
  },
  retry: {
    maxRetries: 3,
    delay: 1000
  },
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
  },
  logging: {
    level: "info"
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000
  }
});
```

### Development Stack

```ts
import { useDevelopmentStack } from "@fgrzl/fetch";

const devClient = useDevelopmentStack(new FetchClient(), {
  auth: {
    tokenProvider: () => "dev-token"
  }
});
// Includes verbose logging and minimal retries
```

### Basic Stack

```ts
import { useBasicStack } from "@fgrzl/fetch";

const basicClient = useBasicStack(new FetchClient(), {
  auth: {
    tokenProvider: () => getToken()
  }
});
// Just authentication and retry
```

## Custom Middleware

You can also create lower-level middleware using the middleware factories:

### Request Middleware

```ts
import { createAuthenticationMiddleware } from "@fgrzl/fetch";

const authMiddleware = createAuthenticationMiddleware({
  tokenProvider: () => getToken()
});

client.useRequestMiddleware(authMiddleware);
```

### Response Middleware

```ts
import { createAuthorizationMiddleware } from "@fgrzl/fetch";

const authzMiddleware = createAuthorizationMiddleware({
  onUnauthorized: () => redirectToLogin()
});

client.useResponseMiddleware(authzMiddleware);
```

## Execution Order

Middlewares execute in the order they are registered:

1. Request middlewares (in registration order)
2. HTTP request
3. Response middlewares (in registration order)

## Advanced Patterns

### Conditional Middleware

```ts
client.useResponseMiddleware(async (response) => {
  if (response.status >= 400) {
    // Only process error responses
    logError(response);
  }
  return response;
});
```

### Middleware Composition

```ts
function createAuthMiddleware(token: string) {
  return async (req: RequestInit, url: string) => {
    req.headers = { ...req.headers, Authorization: `Bearer ${token}` };
    return [req, url];
  };
}

client.useRequestMiddleware(createAuthMiddleware(userToken));
```

See also: [Error Handling](./errors.md)

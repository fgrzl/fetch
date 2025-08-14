# Configuration

This guide covers advanced configuration options for @fgrzl/fetch.

## Custom Client Creation

When you need more control than the default client provides:

```typescript
import { FetchClient } from "@fgrzl/fetch";

const client = new FetchClient({
  // Base configuration
  credentials: "same-origin", // Default: "same-origin"
  headers: {
    "Content-Type": "application/json",
  },
});
```

## Base URL Configuration

Set a base URL to simplify API calls and avoid repeating the full domain in every request:

```typescript
import { FetchClient } from "@fgrzl/fetch";

// Configure a base URL for your API
const apiClient = new FetchClient({
  baseUrl: "https://api.example.com",
});

// All relative URLs are automatically prefixed
await apiClient.get("/users");           // → GET https://api.example.com/users
await apiClient.post("/users", userData); // → POST https://api.example.com/users
await apiClient.get("/posts?page=1");    // → GET https://api.example.com/posts?page=1

// Absolute URLs are used as-is (baseUrl is ignored)
await apiClient.get("https://cdn.example.com/images/avatar.png");
// → GET https://cdn.example.com/images/avatar.png
```

### Environment-Specific Configuration

Perfect for handling different environments:

```typescript
const getApiUrl = () => {
  switch (process.env.NODE_ENV) {
    case "production":
      return "https://api.myapp.com";
    case "staging":
      return "https://api-staging.myapp.com";
    default:
      return "http://localhost:3001";
  }
};

const client = new FetchClient({
  baseUrl: getApiUrl(),
});

// Same code works across all environments
const users = await client.get("/api/users");
```

### API Versioning

Use base URLs for API version management:

```typescript
const v1Client = new FetchClient({
  baseUrl: "https://api.example.com/v1",
});

const v2Client = new FetchClient({
  baseUrl: "https://api.example.com/v2",
});

// Easy to maintain different API versions
const legacyUsers = await v1Client.get("/users");  // → /v1/users
const modernUsers = await v2Client.get("/users");  // → /v2/users
```

### Microservices Architecture

Create dedicated clients for different services:

```typescript
const userService = new FetchClient({
  baseUrl: "https://users.api.example.com",
});

const orderService = new FetchClient({
  baseUrl: "https://orders.api.example.com",
});

const notificationService = new FetchClient({
  baseUrl: "https://notifications.api.example.com",
});

// Clean service boundaries
const user = await userService.get(`/users/${userId}`);
const orders = await orderService.get(`/orders?userId=${userId}`);
await notificationService.post("/send", { userId, message });
```

### Backward Compatibility

Base URL is optional - existing code continues to work unchanged:

```typescript
// Without base URL (existing behavior)
const client = new FetchClient();
await client.get("/api/users");              // → GET /api/users
await client.get("https://api.com/users");   // → GET https://api.com/users

// With base URL (new behavior)
const apiClient = new FetchClient({ baseUrl: "https://api.example.com" });
await apiClient.get("/users");              // → GET https://api.example.com/users
await apiClient.get("https://other.com");   // → GET https://other.com (absolute URL)
```

## Authentication Setup

### Token-Based Authentication

```typescript
import { FetchClient, useAuthentication } from "@fgrzl/fetch";

const client = new FetchClient();
const authClient = useAuthentication(client, {
  tokenProvider: () => localStorage.getItem("auth-token") || "",
});

// All requests now include Authorization header
const profile = await authClient.get("/api/profile");
```

### JWT with Refresh

```typescript
const authClient = useAuthentication(client, {
  tokenProvider: async () => {
    let token = localStorage.getItem("jwt-token");

    // Check if token is expired and refresh if needed
    if (isTokenExpired(token)) {
      token = await refreshToken();
      localStorage.setItem("jwt-token", token);
    }

    return token;
  },
});
```

### Custom Authorization Header

```typescript
const authClient = useAuthentication(client, {
  tokenProvider: () => getApiKey(),
  authScheme: "ApiKey", // Default: "Bearer"
  headerName: "X-API-Key", // Default: "Authorization"
});
```

## Pre-Built Middleware Stacks

### Production Stack

Ready-to-use configuration for production applications:

```typescript
import { useProductionStack } from "@fgrzl/fetch";

const prodClient = useProductionStack(new FetchClient(), {
  auth: {
    tokenProvider: () => getAuthToken(),
  },
  retry: {
    maxRetries: 3,
    delay: 1000,
  },
  cache: {
    ttl: 5 * 60 * 1000, // 5 minutes
    methods: ["GET"],
  },
  logging: {
    level: "info",
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  },
});
```

### Development Stack

Optimized for local development with verbose logging:

```typescript
import { useDevelopmentStack } from "@fgrzl/fetch";

const devClient = useDevelopmentStack(new FetchClient(), {
  auth: {
    tokenProvider: () => "dev-token",
  },
});
```

### Basic Stack

Minimal configuration with just authentication and retry:

```typescript
import { useBasicStack } from "@fgrzl/fetch";

const basicClient = useBasicStack(new FetchClient(), {
  auth: {
    tokenProvider: () => getToken(),
  },
});
```

## Individual Middleware Configuration

### CSRF Protection

```typescript
import { useCSRF } from "@fgrzl/fetch";

// Default: reads XSRF-TOKEN cookie, adds X-XSRF-TOKEN header
const csrfClient = useCSRF(client);

// Custom configuration
const customCsrfClient = useCSRF(client, {
  cookieName: "csrf-token",
  headerName: "X-CSRF-Token",
  skipPatterns: ["/api/public/*"],
});
```

### Authorization Handling

```typescript
import { useAuthorization } from "@fgrzl/fetch";

const authzClient = useAuthorization(client, {
  onUnauthorized: (response) => {
    // Clear stored tokens
    localStorage.removeItem("auth-token");
    // Redirect to login
    window.location.href = "/login";
  },
  onForbidden: (response) => {
    // Show access denied message
    showNotification("Access denied", "error");
  },
  statusCodes: [401, 403], // Handle both 401 and 403
});
```

### Caching

```typescript
import { useCache } from "@fgrzl/fetch";

const cachedClient = useCache(client, {
  ttl: 10 * 60 * 1000, // 10 minutes
  methods: ["GET", "HEAD"],
  keyGenerator: (method, url) => `${method}:${url}`,
  storage: new Map(), // Default: in-memory Map
});
```

### Retry Logic

```typescript
import { useRetry } from "@fgrzl/fetch";

const retryClient = useRetry(client, {
  maxRetries: 3,
  delay: 1000,
  backoff: "exponential", // "fixed" | "linear" | "exponential"
  retryOn: [429, 502, 503, 504], // Which status codes to retry
  onRetry: (attempt, response) => {
    console.log(`Retry attempt ${attempt} for ${response.status}`);
  },
});
```

### Logging

```typescript
import { useLogging } from "@fgrzl/fetch";

const loggedClient = useLogging(client, {
  level: "info", // "debug" | "info" | "warn" | "error"
  includeRequestHeaders: true,
  includeResponseHeaders: false,
  includeRequestBody: false,
  includeResponseBody: false,
  logger: console, // Custom logger implementation
});
```

### Rate Limiting

```typescript
import { useRateLimit } from "@fgrzl/fetch";

const limitedClient = useRateLimit(client, {
  maxRequests: 100,
  windowMs: 60 * 1000, // 100 requests per minute
  algorithm: "token-bucket", // "fixed-window" | "sliding-window" | "token-bucket"
  onLimitReached: (retryAfter) => {
    console.log(`Rate limit reached, retry after ${retryAfter}ms`);
  },
});
```

## Environment-Specific Configuration

### Production Configuration

```typescript
const prodConfig = {
  credentials: "same-origin" as const,
  headers: {
    "Content-Type": "application/json",
  },
};

const prodClient = useProductionStack(new FetchClient(prodConfig), {
  auth: { tokenProvider: () => getSecureToken() },
  logging: { level: "error" }, // Minimal logging in production
  cache: { ttl: 15 * 60 * 1000 }, // Longer cache in production
});
```

### Development Configuration

```typescript
const devConfig = {
  credentials: "omit" as const, // No cookies in dev
};

const devClient = useDevelopmentStack(new FetchClient(devConfig), {
  auth: { tokenProvider: () => "dev-token" },
});
```

## Next Steps

- [Middleware Guide](./middleware.md) - Deep dive into middleware system
- [Error Handling](./error-handling.md) - Robust error management strategies
- [TypeScript Guide](./typescript.md) - Advanced type-safe patterns

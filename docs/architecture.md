# Architecture

This document explains the "pit of success" architecture that makes @fgrzl/fetch both simple and powerful.

## Core Philosophy: Pit of Success

@fgrzl/fetch is designed so that:

- **Simple things are simple** - `api.get("/path")` just works
- **Complex things are possible** - Full middleware customization available
- **TypeScript guides correct usage** - IntelliSense shows you the right way
- **Smart defaults handle common cases** - 80% of users never need configuration

## Export Structure

The main `index.ts` follows a carefully designed discovery pattern:

### 🎯 Level 1: Pre-configured Client (80% of users)

```typescript
import api from "@fgrzl/fetch";

// Just works - no configuration needed!
const users = await api.get("/api/users");
```

**What:** Default export with production-ready middleware stack  
**Why:** Most users just want it to work out of the box  
**Success:** Zero configuration, maximum functionality

### 🎯 Level 2: Custom Client Creation (15% of users)

```typescript
import { FetchClient, addAuthentication } from "@fgrzl/fetch";

const client = new FetchClient(config);
const authClient = addAuthentication(client, options);
```

**What:** Core classes and middleware functions  
**Why:** Users who need custom configuration discover these naturally  
**Success:** Clean, consistent API across all middleware

### 🎯 Level 3: TypeScript Integration

```typescript
import type { FetchClientConfig, AuthenticationOptions } from "@fgrzl/fetch";
```

**What:** Type definitions for configuration objects  
**Why:** IntelliSense guides users to correct usage  
**Success:** Type safety without learning complex APIs

### 🎯 Level 4: Advanced Error Handling

```typescript
import { HttpError, NetworkError } from "@fgrzl/fetch";
```

**What:** Error classes for sophisticated error handling  
**Why:** Advanced users discover these when they need them  
**Success:** Powerful error handling without overwhelming beginners

## Middleware System

### Request/Response Pipeline

```
Request  →  [Middleware 1]  →  [Middleware 2]  →  HTTP  →  [Middleware 2]  →  [Middleware 1]  →  Response
```

Each middleware can:

- **Transform requests** before they're sent
- **Process responses** after they're received
- **Handle errors** at any stage
- **Add cross-cutting concerns** (auth, logging, caching)

### Middleware Composition

Middleware is composable and non-blocking:

```typescript
const client = addAuthentication(addRetry(addLogging(new FetchClient())));
```

Each middleware returns a new enhanced client, enabling clean composition.

### Pre-built Stacks

For common scenarios, we provide pre-configured stacks:

- **Production Stack**: Auth + Retry + Cache + Logging + Rate Limiting
- **Development Stack**: Auth + Retry + Verbose Logging
- **Basic Stack**: Auth + Retry

## Service Organization

### Base URL Strategy

Modern applications often work with multiple APIs and services. Base URLs provide clean service boundaries:

```typescript
// Service-specific clients
const userService = new FetchClient({
  baseUrl: "https://users.api.myapp.com",
});

const orderService = new FetchClient({
  baseUrl: "https://orders.api.myapp.com",
});

const paymentService = new FetchClient({
  baseUrl: "https://payments.api.myapp.com",
});

// Each service has its own error handling and middleware
const authUserService = addAuthentication(userService, userAuthConfig);
const retryOrderService = addRetry(orderService, orderRetryConfig);
```

### Environment Configuration

Base URLs enable clean environment management:

```typescript
const createApiClient = (environment: string) => {
  const baseUrls = {
    development: "http://localhost:3001",
    staging: "https://api-staging.myapp.com",
    production: "https://api.myapp.com",
  };

  return new FetchClient({
    baseUrl: baseUrls[environment] || baseUrls.development,
  });
};

// Same code works across all environments
const apiClient = createApiClient(process.env.NODE_ENV);
```

### API Versioning Architecture

Use base URLs to manage API versions cleanly:

```typescript
// Version-specific clients
const apiV1 = new FetchClient({
  baseUrl: "https://api.myapp.com/v1",
});

const apiV2 = new FetchClient({
  baseUrl: "https://api.myapp.com/v2",
});

// Gradual migration strategy
const getUsersV1 = (id: string) => apiV1.get(`/users/${id}`);
const getUsersV2 = (id: string) => apiV2.get(`/users/${id}`);

// Feature flagged migration
const getUsers = featureFlags.useV2Api ? getUsersV2 : getUsersV1;
```

### Microservices Integration

Each microservice gets its own configured client:

```typescript
// services/api.ts
export const authService = addAuthentication(
  new FetchClient({ baseUrl: config.AUTH_SERVICE_URL }),
  { tokenProvider: getAuthToken },
);

export const userService = addProductionStack(
  new FetchClient({ baseUrl: config.USER_SERVICE_URL }),
  productionConfig,
);

export const notificationService = addRetry(
  new FetchClient({ baseUrl: config.NOTIFICATION_SERVICE_URL }),
  { maxRetries: 5, delay: 1000 },
);

// Usage throughout the application
import { userService, notificationService } from "./services/api";

const user = await userService.get(`/users/${userId}`);
await notificationService.post("/send", { userId, message });
```

## Error Handling Strategy

### Response-Based Error Handling

Instead of throwing exceptions for HTTP errors, we return structured responses:

```typescript
const response = await api.get("/api/users");

if (response.ok) {
  // Success path - response.data is available
  console.log(response.data);
} else {
  // Error path - response.error contains details
  console.error(response.error?.message);
}
```

**Benefits:**

- No try/catch required for HTTP errors
- Consistent error handling across the application
- TypeScript can ensure error handling paths are covered

### Exception-Based for Network Errors

Network errors (connection failed, timeout) throw exceptions since they represent truly exceptional conditions that usually can't be handled gracefully.

### Custom Error Classes

```typescript
// Base class for all fetch-related errors
class FetchError extends Error {}

// HTTP error responses (4xx, 5xx)
class HttpError extends FetchError {
  constructor(
    public status: number,
    public statusText: string,
    public response: Response,
  ) {}
}

// Network failures
class NetworkError extends FetchError {
  constructor(
    message: string,
    public url: string,
  ) {}
}
```

## Type Safety Features

### Generic Response Types

```typescript
interface User {
  id: number;
  name: string;
}

const response = await api.get<User[]>("/api/users");
// response.data is typed as User[] | null
```

### Configuration Validation

TypeScript ensures middleware configuration is correct:

```typescript
const authClient = addAuthentication(client, {
  tokenProvider: () => getToken(), // Must return string | Promise<string>
  authScheme: "Bearer", // Only valid auth schemes allowed
});
```

### Middleware Type Safety

Middleware functions are fully typed to prevent composition errors:

```typescript
// This would be a TypeScript error:
const invalid = addAuthentication(
  addCache(client, { ttl: "5 minutes" }), // ❌ ttl must be number
);
```

## Performance Considerations

### Tree Shaking

The export structure enables optimal bundle sizes:

```typescript
// Only includes the authentication middleware
import { addAuthentication } from "@fgrzl/fetch";
```

### Middleware Overhead

- **Request middleware**: Minimal overhead (just function calls)
- **Response middleware**: Processes responses but doesn't duplicate data
- **Caching**: Optional and configurable
- **Logging**: Configurable levels to minimize production overhead

### Memory Management

- **Streaming responses**: Supported for large payloads
- **Cache eviction**: Automatic TTL-based cleanup
- **Request deduplication**: Prevents duplicate in-flight requests

## Testing Architecture

### Middleware Testing

Each middleware is independently testable:

```typescript
describe("Authentication Middleware", () => {
  it("adds authorization header", async () => {
    const mockClient = new FetchClient();
    const authClient = addAuthentication(mockClient, {
      tokenProvider: () => "test-token",
    });

    // Test that requests include the header
  });
});
```

### Integration Testing

Test complete middleware stacks:

```typescript
const testClient = addProductionStack(new FetchClient(), config);
// Test the entire pipeline
```

### Mocking Support

Built-in support for test mocks:

```typescript
// Mock the underlying fetch
global.fetch = vi.fn();

// All clients use the mocked fetch
const response = await api.get("/test");
expect(fetch).toHaveBeenCalledWith(/* ... */);
```

## Extension Points

### Custom Middleware

Create middleware that integrates seamlessly:

```typescript
function createMetricsMiddleware(metricsClient: MetricsClient) {
  return (client: FetchClient) => {
    // Add request timing, success/error rates, etc.
    return client
      .useRequestMiddleware(/* ... */)
      .useResponseMiddleware(/* ... */);
  };
}

// Use like built-in middleware
const client = createMetricsMiddleware(metrics)(baseClient);
```

### Custom Error Classes

Extend the error hierarchy:

```typescript
class APIError extends HttpError {
  constructor(
    response: Response,
    public errorCode: string,
  ) {
    super(response.status, response.statusText, response);
  }
}
```

### Custom Storage Adapters

For caching middleware:

```typescript
class RedisStorage implements CacheStorage {
  async get(key: string) {
    /* Redis get */
  }
  async set(key: string, value: any, ttl: number) {
    /* Redis setex */
  }
  async delete(key: string) {
    /* Redis del */
  }
}

const client = addCache(baseClient, {
  storage: new RedisStorage(),
});
```

## Design Principles

1. **Progressive Disclosure**: Simple by default, powerful when needed
2. **Composability**: Middleware composes cleanly without conflicts
3. **Type Safety**: TypeScript prevents errors at compile time
4. **Testability**: Every piece is independently testable
5. **Performance**: Minimal overhead for unused features
6. **Consistency**: Same patterns throughout the API

These principles ensure that @fgrzl/fetch scales from simple scripts to complex applications while maintaining a consistent developer experience.

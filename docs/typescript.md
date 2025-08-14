# TypeScript Guide

Advanced TypeScript patterns and type safety features.

## Generic Response Types

Type your API responses for full IntelliSense support:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

// GET request with typed response
const response = await api.get<User[]>("/api/users");
if (response.ok) {
  // response.data is typed as User[] | null
  response.data?.forEach(user => {
    console.log(user.name); // ✅ TypeScript knows this is a string
    console.log(user.invalid); // ❌ TypeScript error
  });
}

// POST request with typed request and response
const createResponse = await api.post<User, CreateUserRequest>(
  "/api/users", 
  { name: "John", email: "john@example.com" }
);
```

## Configuration Types

All configuration options are fully typed:

```typescript
import type { 
  FetchClientOptions,
  AuthenticationOptions,
  RetryOptions,
  CacheOptions 
} from "@fgrzl/fetch";

const clientConfig: FetchClientOptions = {
  credentials: "same-origin", // ✅ Only valid values allowed
  headers: {
    "Content-Type": "application/json"
  }
};

const authConfig: AuthenticationOptions = {
  tokenProvider: () => getToken(), // ✅ Must return string | Promise<string>
  authScheme: "Bearer", // ✅ Only valid auth schemes
  headerName: "Authorization" // ✅ Optional, defaults to "Authorization"
};

const retryConfig: RetryOptions = {
  maxRetries: 3, // ✅ Must be number
  delay: 1000, // ✅ Must be number
  backoff: "exponential" // ✅ Only "fixed" | "linear" | "exponential"
};
```

## Middleware Composition with Types

TypeScript ensures middleware is composed correctly:

```typescript
import { FetchClient, useAuthentication, useRetry, useLogging } from "@fgrzl/fetch";

// ✅ Correct composition
const client = useLogging(
  useRetry(
    useAuthentication(new FetchClient(), {
      tokenProvider: () => getToken()
    }),
    { maxRetries: 3 }
  ),
  { level: "info" }
);

// ❌ TypeScript would catch configuration errors:
const invalidClient = useAuthentication(new FetchClient(), {
  tokenProvider: 123 // ❌ Error: must be function
});
```

## Custom Middleware Types

Create type-safe custom middleware:

```typescript
import type { FetchMiddleware, FetchClient } from "@fgrzl/fetch";

interface MetricsOptions {
  endpoint: string;
  apiKey: string;
  sampleRate?: number;
}

function createMetricsMiddleware(options: MetricsOptions): FetchMiddleware {
  return {
    request: async (init, url) => {
      // Track request metrics
      const startTime = performance.now();
      
      // Store in request for response middleware
      (init as any).__startTime = startTime;
      
      return [init, url];
    },
    
    response: async (response) => {
      const startTime = (response.request as any).__startTime;
      const duration = performance.now() - startTime;
      
      // Send metrics
      if (Math.random() < (options.sampleRate ?? 1.0)) {
        await sendMetrics(options.endpoint, {
          url: response.url,
          status: response.status,
          duration
        }, options.apiKey);
      }
      
      return response;
    }
  };
}

// Usage with type safety
function useMetrics(client: FetchClient, options: MetricsOptions): FetchClient {
  return client.use(createMetricsMiddleware(options));
}

// ✅ TypeScript ensures correct usage
const metricsClient = useMetrics(client, {
  endpoint: "https://metrics.example.com",
  apiKey: "key",
  sampleRate: 0.1
});
```

## Error Handling Types

Type-safe error handling:

```typescript
import type { FetchResponse } from "@fgrzl/fetch";
import { HttpError, NetworkError } from "@fgrzl/fetch";

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

interface User {
  id: number;
  name: string;
}

async function fetchUser(id: number): Promise<User | null> {
  const response: FetchResponse<User> = await api.get<User>(`/api/users/${id}`);
  
  if (response.ok) {
    return response.data; // Type: User | null
  }
  
  // Handle different error types
  switch (response.status) {
    case 404:
      return null; // User not found
    case 400:
      // Parse API error response
      const apiError = response.data as ApiError;
      throw new Error(`Invalid request: ${apiError.message}`);
    case 401:
      throw new Error("Authentication required");
    default:
      throw new Error(`API error: ${response.status}`);
  }
}

// Usage with proper error handling
try {
  const user = await fetchUser(123);
  if (user) {
    console.log(user.name); // ✅ TypeScript knows user is User
  } else {
    console.log("User not found");
  }
} catch (error) {
  if (error instanceof NetworkError) {
    console.error("Network error:", error.message);
  } else {
    console.error("API error:", error.message);
  }
}
```

## Advanced Type Patterns

### Discriminated Unions for API Responses

```typescript
// Backend API response pattern
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

async function typedApiCall<T>(url: string): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (response.data?.success) {
    return response.data.data; // ✅ TypeScript knows this is T
  } else {
    throw new Error(response.data?.error ?? "Unknown API error");
  }
}

// Usage
interface Product {
  id: number;
  name: string;
  price: number;
}

const product = await typedApiCall<Product>("/api/products/1");
console.log(product.name); // ✅ Fully typed
```

### Conditional Types for Middleware

```typescript
type MiddlewareConfig<T extends string> = 
  T extends "auth" ? AuthenticationOptions :
  T extends "retry" ? RetryOptions :
  T extends "cache" ? CacheOptions :
  never;

function createTypedClient<T extends string>(
  type: T,
  config: MiddlewareConfig<T>
): FetchClient {
  const client = new FetchClient();
  
  switch (type) {
    case "auth":
      return useAuthentication(client, config as AuthenticationOptions);
    case "retry":
      return useRetry(client, config as RetryOptions);
    case "cache":
      return useCache(client, config as CacheOptions);
    default:
      return client;
  }
}

// ✅ TypeScript infers correct config type
const authClient = createTypedClient("auth", {
  tokenProvider: () => getToken() // ✅ Knows this should be AuthenticationOptions
});
```

### Generic Middleware Factory

```typescript
type MiddlewareFactory<TOptions, TClient extends FetchClient = FetchClient> = 
  (client: TClient, options: TOptions) => TClient;

function composeMiddleware<TOptions1, TOptions2>(
  middleware1: MiddlewareFactory<TOptions1>,
  middleware2: MiddlewareFactory<TOptions2>
): MiddlewareFactory<TOptions1 & TOptions2> {
  return (client, options) => {
    return middleware2(
      middleware1(client, options), 
      options
    );
  };
}

// Usage
const authRetryMiddleware = composeMiddleware(useAuthentication, useRetry);

const client = authRetryMiddleware(new FetchClient(), {
  // ✅ TypeScript requires both auth and retry options
  tokenProvider: () => getToken(),
  maxRetries: 3,
  delay: 1000
});
```

## Type Guards and Utilities

### Response Type Guards

```typescript
function isSuccessResponse<T>(
  response: FetchResponse<T>
): response is FetchResponse<T> & { ok: true; data: T } {
  return response.ok && response.data !== null;
}

function isErrorResponse<T>(
  response: FetchResponse<T>
): response is FetchResponse<T> & { ok: false; error: Error } {
  return !response.ok;
}

// Usage
const response = await api.get<User>("/api/user");

if (isSuccessResponse(response)) {
  // TypeScript knows response.data is User (not User | null)
  console.log(response.data.name);
} else if (isErrorResponse(response)) {
  // TypeScript knows response.error exists
  console.error(response.error.message);
}
```

### Utility Types

```typescript
// Extract the data type from a FetchResponse
type ResponseData<T> = T extends FetchResponse<infer U> ? U : never;

// Create a type for API endpoints
interface ApiEndpoints {
  "/api/users": User[];
  "/api/users/:id": User;
  "/api/products": Product[];
  "/api/orders": Order[];
}

// Type-safe API client
class TypedApiClient {
  async get<K extends keyof ApiEndpoints>(
    endpoint: K
  ): Promise<FetchResponse<ApiEndpoints[K]>> {
    return api.get<ApiEndpoints[K]>(endpoint);
  }
  
  async post<K extends keyof ApiEndpoints>(
    endpoint: K,
    data: Partial<ApiEndpoints[K]>
  ): Promise<FetchResponse<ApiEndpoints[K]>> {
    return api.post<ApiEndpoints[K]>(endpoint, data);
  }
}

const typedApi = new TypedApiClient();

// ✅ TypeScript knows the return type
const users = await typedApi.get("/api/users");
if (users.ok) {
  // users.data is typed as User[] | null
}
```

## Best Practices

1. **Use generics** for API response types
2. **Type middleware configuration** completely
3. **Create type guards** for response handling
4. **Use discriminated unions** for complex API patterns
5. **Leverage TypeScript's inference** where possible
6. **Create utility types** for common patterns
7. **Test type safety** with TypeScript's strict mode

## Configuration for Maximum Type Safety

Enable strict TypeScript settings:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noImplicitThis": true
  }
}
```

With these settings, TypeScript will catch potential issues at compile time, making your API client code more robust.
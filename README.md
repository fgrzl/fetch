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

### Request Middleware

Request middleware functions run before the HTTP request is sent, allowing you to modify request options and URLs.

```ts
import { FetchClient, RequestMiddleware } from "@fgrzl/fetch";

const client = new FetchClient();

// Add authentication header
client.useRequestMiddleware(async (req, url) => {
  const token = localStorage.getItem("auth-token");
  const headers = {
    ...req.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  return [{ ...req, headers }, url];
});

// Add debug information
client.useRequestMiddleware(async (req, url) => {
  const headers = {
    ...req.headers,
    "X-Debug": "true",
    "X-Timestamp": new Date().toISOString(),
  };
  return [{ ...req, headers }, url];
});
```

### Response Middleware

Response middleware functions run after the HTTP response is received, allowing you to process or modify responses.

```ts
import { ResponseMiddleware } from "@fgrzl/fetch";

// Log response times
client.useResponseMiddleware(async (response) => {
  console.log(`Request to ${response.url} took ${performance.now()}ms`);
  return response;
});

// Extract and store updated auth tokens
client.useResponseMiddleware(async (response) => {
  const newToken = response.headers.get("X-New-Auth-Token");
  if (newToken) {
    localStorage.setItem("auth-token", newToken);
  }
  return response;
});
```

### Middleware Execution Order

Middlewares execute in the order they are registered:

1. **Request middlewares**: Execute in registration order before the request
2. **Response middlewares**: Execute in registration order after the response

```ts
const client = new FetchClient();

// These will execute in this exact order:
client.useRequestMiddleware(first); // 1st: runs first
client.useRequestMiddleware(second); // 2nd: runs second
client.useRequestMiddleware(third); // 3rd: runs third

client.useResponseMiddleware(alpha); // 1st: processes response first
client.useResponseMiddleware(beta); // 2nd: processes response second
client.useResponseMiddleware(gamma); // 3rd: processes response third
```

## 🔄 Common Patterns

### Authentication with Token Retry

Automatically retry requests with fresh tokens when authentication fails:

```ts
import { FetchClient, HttpError } from "@fgrzl/fetch";

const client = new FetchClient();

// Request middleware: Add auth token
client.useRequestMiddleware(async (req, url) => {
  const token = localStorage.getItem("auth-token");
  const headers = {
    ...req.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  return [{ ...req, headers }, url];
});

// Response middleware: Handle token refresh
client.useResponseMiddleware(async (response) => {
  if (response.status === 401) {
    // Try to refresh the token
    const refreshToken = localStorage.getItem("refresh-token");
    if (refreshToken) {
      try {
        const refreshResponse = await fetch("/auth/refresh", {
          method: "POST",
          headers: { Authorization: `Bearer ${refreshToken}` },
        });

        if (refreshResponse.ok) {
          const { access_token } = await refreshResponse.json();
          localStorage.setItem("auth-token", access_token);

          // Clone and retry the original request
          const retryResponse = await fetch(response.url, {
            ...response,
            headers: {
              ...response.headers,
              Authorization: `Bearer ${access_token}`,
            },
          });
          return retryResponse;
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    }

    // Redirect to login if refresh fails
    window.location.href = "/login";
  }
  return response;
});
```

### Request Correlation IDs

Track requests across services with correlation IDs:

```ts
import { v4 as uuidv4 } from "uuid";

client.useRequestMiddleware(async (req, url) => {
  const correlationId = uuidv4();

  // Store correlation ID for debugging
  console.log(`Starting request ${correlationId} to ${url}`);

  const headers = {
    ...req.headers,
    "X-Correlation-ID": correlationId,
    "X-Request-ID": correlationId,
  };

  return [{ ...req, headers }, url];
});

client.useResponseMiddleware(async (response) => {
  const correlationId = response.headers.get("X-Correlation-ID");
  console.log(
    `Completed request ${correlationId} with status ${response.status}`,
  );
  return response;
});
```

### Eventual Consistency Polling

Handle read-after-write scenarios by polling until data is available:

```ts
// Create a specialized client for polling operations
const pollingClient = new FetchClient();

pollingClient.useResponseMiddleware(async (response) => {
  // If we get 404 on a read after write, poll until available
  if (response.status === 404 && response.headers.get("X-Operation-ID")) {
    const operationId = response.headers.get("X-Operation-ID");
    const maxRetries = 10;
    const retryDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      try {
        const retryResponse = await fetch(response.url, {
          method: "GET",
          headers: { "X-Operation-ID": operationId },
        });

        if (retryResponse.ok) {
          return retryResponse;
        }

        if (retryResponse.status !== 404) {
          return retryResponse; // Return other errors immediately
        }
      } catch (error) {
        console.warn(`Polling attempt ${attempt + 1} failed:`, error);
      }
    }
  }

  return response;
});

// Usage for read-after-write operations
const createUser = async (userData: any) => {
  // Write operation
  const createResponse = await client.post("/api/users", userData);
  const operationId = createResponse.headers.get("X-Operation-ID");

  // Read operation with polling fallback
  const userResponse = await pollingClient.get(
    `/api/users/${createResponse.id}`,
    {
      headers: { "X-Operation-ID": operationId },
    },
  );

  return userResponse;
};
```

### Centralized Error Mapping

Transform backend errors into user-friendly messages:

```ts
// Define error mappings
const errorMappings = {
  400: "Invalid request. Please check your input.",
  401: "Please log in to continue.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  422: "Validation failed. Please check your input.",
  429: "Too many requests. Please try again later.",
  500: "An internal error occurred. Please try again.",
  502: "Service temporarily unavailable.",
  503: "Service temporarily unavailable.",
  504: "Request timed out. Please try again.",
};

client.useResponseMiddleware(async (response) => {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    // Create user-friendly error with mapped message
    const userMessage =
      errorMappings[response.status] || "An unexpected error occurred.";

    // Add user-friendly message to error body
    const enhancedBody = {
      ...body,
      userMessage,
      originalStatus: response.status,
      timestamp: new Date().toISOString(),
    };

    // Create a new response with enhanced error information
    return new Response(JSON.stringify(enhancedBody), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  return response;
});
```

## 🔧 TypeScript Best Practices

### Typing Request and Response Shapes

Define clear interfaces for your API contracts:

```ts
import { FetchClient } from "@fgrzl/fetch";

// Define API response types
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

interface ApiResponse<T> {
  data: T;
  message: string;
  timestamp: string;
}

const client = new FetchClient();

// Type-safe API calls
const getUser = (id: number): Promise<ApiResponse<User>> => {
  return client.get<ApiResponse<User>>(`/api/users/${id}`);
};

const createUser = (
  userData: CreateUserRequest,
): Promise<ApiResponse<User>> => {
  return client.post<ApiResponse<User>>("/api/users", userData);
};

// Usage with full type safety
const user = await getUser(123);
console.log(user.data.name); // TypeScript knows this is a string
```

### Generic Middleware Patterns

Create reusable, type-safe middleware:

```ts
import { RequestMiddleware, ResponseMiddleware } from "@fgrzl/fetch";

// Type-safe request middleware factory
function createAuthMiddleware<T extends string>(
  tokenProvider: () => T | null,
): RequestMiddleware {
  return async (req, url) => {
    const token = tokenProvider();
    const headers = {
      ...req.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    return [{ ...req, headers }, url];
  };
}

// Type-safe response middleware for data transformation
function createDataTransformMiddleware<TInput, TOutput>(
  transformer: (input: TInput) => TOutput,
): ResponseMiddleware {
  return async (response) => {
    if (response.ok && response.headers.get("content-type")?.includes("json")) {
      const data = (await response.json()) as TInput;
      const transformedData = transformer(data);

      return new Response(JSON.stringify(transformedData), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    return response;
  };
}

// Usage
const authMiddleware = createAuthMiddleware(() =>
  localStorage.getItem("token"),
);
const transformMiddleware = createDataTransformMiddleware<
  RawApiData,
  CleanData
>((raw) => ({ ...raw, processedAt: new Date() }));

client.useRequestMiddleware(authMiddleware);
client.useResponseMiddleware(transformMiddleware);
```

### Type-Safe Error Handling

Create typed error handlers for different scenarios:

```ts
import { HttpError, NetworkError, FetchError } from "@fgrzl/fetch";

// Define error types for your API
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

interface ValidationError extends ApiError {
  code: "VALIDATION_ERROR";
  details: {
    field: string;
    message: string;
  }[];
}

// Type-safe error handling utility
async function handleApiCall<T>(
  apiCall: () => Promise<T>,
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    if (error instanceof HttpError) {
      const apiError = error.body as ApiError;

      switch (apiError.code) {
        case "VALIDATION_ERROR":
          const validationError = apiError as ValidationError;
          return {
            error: `Validation failed: ${validationError.details.map((d) => d.message).join(", ")}`,
          };

        case "UNAUTHORIZED":
          return { error: "Please log in to continue" };

        default:
          return { error: apiError.message || "An error occurred" };
      }
    }

    if (error instanceof NetworkError) {
      return { error: "Network error. Please check your connection." };
    }

    return { error: "An unexpected error occurred" };
  }
}

// Usage
const result = await handleApiCall(() => client.get<User>("/api/users/123"));
if (result.error) {
  console.error(result.error);
} else {
  console.log(result.data.name); // TypeScript knows data is User
}
```

## 🚀 Advanced Usage

### Conditional Middleware Application

Apply middleware only for specific routes or conditions:

```ts
import { RequestMiddleware, ResponseMiddleware } from "@fgrzl/fetch";

// Conditional request middleware
const conditionalAuthMiddleware: RequestMiddleware = async (req, url) => {
  // Only add auth to protected routes
  if (url.includes("/api/protected/") || url.includes("/api/admin/")) {
    const token = localStorage.getItem("admin-token");
    const headers = {
      ...req.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    return [{ ...req, headers }, url];
  }
  return [req, url];
};

// Conditional response middleware
const conditionalCachingMiddleware: ResponseMiddleware = async (response) => {
  // Only cache GET requests to specific endpoints
  if (response.url.includes("/api/cache/") && response.status === 200) {
    const cacheKey = `cache_${response.url}`;
    const data = await response.clone().text();
    localStorage.setItem(cacheKey, data);
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
  }
  return response;
};

client.useRequestMiddleware(conditionalAuthMiddleware);
client.useResponseMiddleware(conditionalCachingMiddleware);
```

### Middleware Composition and Factories

Create composable middleware for complex scenarios:

```ts
// Middleware factory for different environments
function createEnvironmentMiddleware(environment: "dev" | "staging" | "prod") {
  const configs = {
    dev: { baseUrl: "http://localhost:3000", debug: true },
    staging: { baseUrl: "https://staging-api.example.com", debug: true },
    prod: { baseUrl: "https://api.example.com", debug: false },
  };

  const config = configs[environment];

  const requestMiddleware: RequestMiddleware = async (req, url) => {
    // Convert relative URLs to absolute
    const fullUrl = url.startsWith("/") ? `${config.baseUrl}${url}` : url;

    const headers = {
      ...req.headers,
      "X-Environment": environment,
      ...(config.debug && { "X-Debug": "true" }),
    };

    return [{ ...req, headers }, fullUrl];
  };

  const responseMiddleware: ResponseMiddleware = async (response) => {
    if (config.debug) {
      console.log(
        `[${environment.upper()}] ${response.status} ${response.url}`,
      );
    }
    return response;
  };

  return { requestMiddleware, responseMiddleware };
}

// Middleware composition utility
function composeMiddleware(
  ...middlewares: RequestMiddleware[]
): RequestMiddleware {
  return async (req, url) => {
    let currentReq = req;
    let currentUrl = url;

    for (const middleware of middlewares) {
      [currentReq, currentUrl] = await middleware(currentReq, currentUrl);
    }

    return [currentReq, currentUrl];
  };
}

// Usage
const { requestMiddleware, responseMiddleware } =
  createEnvironmentMiddleware("dev");

const composedMiddleware = composeMiddleware(
  requestMiddleware,
  createAuthMiddleware(() => localStorage.getItem("token")),
  createLoggingMiddleware(),
);

client.useRequestMiddleware(composedMiddleware);
client.useResponseMiddleware(responseMiddleware);
```

### Performance Optimizations

Optimize middleware for high-throughput applications:

```ts
// Cached middleware to avoid repeated computations
const createCachedAuthMiddleware = (): RequestMiddleware => {
  let cachedToken: string | null = null;
  let tokenExpiry: number = 0;

  return async (req, url) => {
    const now = Date.now();

    // Refresh token only if expired
    if (!cachedToken || now > tokenExpiry) {
      cachedToken = localStorage.getItem("auth-token");
      // Cache for 5 minutes
      tokenExpiry = now + 5 * 60 * 1000;
    }

    const headers = {
      ...req.headers,
      ...(cachedToken && { Authorization: `Bearer ${cachedToken}` }),
    };

    return [{ ...req, headers }, url];
  };
};

// Debounced middleware for rate limiting
const createDebouncedMiddleware = (delay: number = 100): RequestMiddleware => {
  const pending = new Map<string, Promise<[RequestInit, string]>>();

  return async (req, url) => {
    const key = `${req.method || "GET"}:${url}`;

    if (pending.has(key)) {
      return pending.get(key)!;
    }

    const promise = new Promise<[RequestInit, string]>((resolve) => {
      setTimeout(() => {
        pending.delete(key);
        resolve([req, url]);
      }, delay);
    });

    pending.set(key, promise);
    return promise;
  };
};

// Circuit breaker pattern
const createCircuitBreakerMiddleware = (
  failureThreshold: number = 5,
  resetTimeout: number = 60000,
): ResponseMiddleware => {
  let failures = 0;
  let lastFailureTime = 0;
  let isOpen = false;

  return async (response) => {
    const now = Date.now();

    // Reset circuit if timeout has passed
    if (isOpen && now - lastFailureTime > resetTimeout) {
      isOpen = false;
      failures = 0;
    }

    if (isOpen) {
      throw new Error("Circuit breaker is open");
    }

    if (!response.ok && response.status >= 500) {
      failures++;
      lastFailureTime = now;

      if (failures >= failureThreshold) {
        isOpen = true;
        console.warn("Circuit breaker opened due to repeated failures");
      }
    } else if (response.ok) {
      // Reset on success
      failures = 0;
    }

    return response;
  };
};
```

### Complete Integration Example

Here's a complete example showing multiple patterns working together:

```ts
import { FetchClient, HttpError } from "@fgrzl/fetch";

// Types
interface ApiConfig {
  baseUrl: string;
  environment: "dev" | "staging" | "prod";
  enableRetry: boolean;
  enableCircuitBreaker: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
}

// Create configured client
function createApiClient(config: ApiConfig): FetchClient {
  const client = new FetchClient({
    credentials: "same-origin",
  });

  // Environment-specific middleware
  client.useRequestMiddleware(async (req, url) => {
    const fullUrl = url.startsWith("/") ? `${config.baseUrl}${url}` : url;
    const headers = {
      ...req.headers,
      "Content-Type": "application/json",
      "X-Environment": config.environment,
      "X-Client-Version": "1.0.0",
    };
    return [{ ...req, headers }, fullUrl];
  });

  // Auth middleware
  client.useRequestMiddleware(createCachedAuthMiddleware());

  // Correlation ID middleware
  client.useRequestMiddleware(async (req, url) => {
    const correlationId = crypto.randomUUID();
    const headers = {
      ...req.headers,
      "X-Correlation-ID": correlationId,
    };
    return [{ ...req, headers }, url];
  });

  // Circuit breaker (production only)
  if (config.enableCircuitBreaker && config.environment === "prod") {
    client.useResponseMiddleware(createCircuitBreakerMiddleware());
  }

  // Retry middleware
  if (config.enableRetry) {
    client.useResponseMiddleware(async (response) => {
      if (response.status >= 500 && response.status < 600) {
        // Retry logic here
        console.log("Retrying request due to server error...");
      }
      return response;
    });
  }

  // Error mapping
  client.useResponseMiddleware(async (response) => {
    if (!response.ok) {
      const correlationId = response.headers.get("X-Correlation-ID");
      console.error(`Request failed [${correlationId}]:`, response.status);
    }
    return response;
  });

  return client;
}

// Usage
const apiClient = createApiClient({
  baseUrl: "https://api.example.com",
  environment: "prod",
  enableRetry: true,
  enableCircuitBreaker: true,
});

// Type-safe API methods
const userApi = {
  getUser: (id: number): Promise<User> => apiClient.get<User>(`/users/${id}`),

  createUser: (userData: Omit<User, "id">): Promise<User> =>
    apiClient.post<User>("/users", userData),

  updateUser: (id: number, userData: Partial<User>): Promise<User> =>
    apiClient.put<User>(`/users/${id}`, userData),

  deleteUser: (id: number): Promise<void> =>
    apiClient.del<void>(`/users/${id}`),
};

// Usage with error handling
try {
  const user = await userApi.getUser(123);
  console.log("User loaded:", user.name);
} catch (error) {
  if (error instanceof HttpError) {
    console.error("API Error:", error.status, error.body);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## ⚡ Performance Considerations

### Middleware Order Optimization

Order middleware strategically for best performance:

```ts
const client = new FetchClient();

// ✅ Fast middleware first (simple header additions)
client.useRequestMiddleware(addCorrelationId);
client.useRequestMiddleware(addTimestamp);

// ✅ Medium complexity middleware
client.useRequestMiddleware(addAuthToken);
client.useRequestMiddleware(transformUrl);

// ✅ Heavy middleware last (async operations, storage access)
client.useRequestMiddleware(checkCacheAndModifyRequest);
client.useRequestMiddleware(validateAndEnrichRequest);

// Same principle for response middleware
client.useResponseMiddleware(logResponse); // Fast
client.useResponseMiddleware(extractHeaders); // Fast
client.useResponseMiddleware(updateCache); // Heavy
client.useResponseMiddleware(processComplexData); // Heavy
```

### Memory Management

Avoid memory leaks in long-running applications:

```ts
// ❌ Bad: Creates closures that hold references
function badMiddlewareFactory() {
  const largeData = new Array(1000000).fill("data");

  return async (req, url) => {
    // This holds reference to largeData forever
    return [{ ...req, someData: largeData[0] }, url];
  };
}

// ✅ Good: Clean references and use weak references where appropriate
function goodMiddlewareFactory() {
  return async (req, url) => {
    // Create data only when needed
    const necessaryData = computeNecessaryData();
    return [{ ...req, data: necessaryData }, url];
  };
}

// ✅ Good: Use WeakMap for temporary caching
const responseCache = new WeakMap<Response, any>();

const cachingMiddleware: ResponseMiddleware = async (response) => {
  if (!responseCache.has(response)) {
    const data = await response.clone().json();
    responseCache.set(response, data);
  }
  return response;
};
```

### Request Batching and Caching

Implement intelligent caching to reduce network requests:

```ts
// Simple request deduplication
class RequestDeduplicator {
  private pending = new Map<string, Promise<Response>>();

  createMiddleware(): RequestMiddleware {
    return async (req, url) => {
      const key = `${req.method || "GET"}:${url}:${JSON.stringify(req.body)}`;

      // For GET requests, deduplicate concurrent identical requests
      if (req.method === "GET" && this.pending.has(key)) {
        console.log("Deduplicating request:", key);
        // Return same promise for identical concurrent requests
        await this.pending.get(key);
      }

      return [req, url];
    };
  }
}

const deduplicator = new RequestDeduplicator();
client.useRequestMiddleware(deduplicator.createMiddleware());

// Response caching with TTL
class ResponseCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  createMiddleware(ttlMs: number = 300000): ResponseMiddleware {
    return async (response) => {
      if (response.ok && response.url.includes("/api/cache/")) {
        const key = response.url;
        const now = Date.now();

        // Clean expired entries
        for (const [k, v] of this.cache.entries()) {
          if (v.expiry < now) {
            this.cache.delete(k);
          }
        }

        // Cache successful responses
        const data = await response.clone().json();
        this.cache.set(key, { data, expiry: now + ttlMs });
      }

      return response;
    };
  }
}

const cache = new ResponseCache();
client.useResponseMiddleware(cache.createMiddleware(5 * 60 * 1000)); // 5 minute TTL
```

### Monitoring and Metrics

Track performance metrics for optimization:

```ts
class PerformanceMonitor {
  private metrics = {
    requestCount: 0,
    responseCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    slowRequests: 0,
  };

  createRequestMiddleware(): RequestMiddleware {
    return async (req, url) => {
      this.metrics.requestCount++;

      // Add performance marker
      const startTime = performance.now();
      const headers = {
        ...req.headers,
        "X-Start-Time": startTime.toString(),
      };

      return [{ ...req, headers }, url];
    };
  }

  createResponseMiddleware(): ResponseMiddleware {
    return async (response) => {
      this.metrics.responseCount++;

      const startTime = parseFloat(response.headers.get("X-Start-Time") || "0");
      if (startTime > 0) {
        const responseTime = performance.now() - startTime;

        // Update average response time
        this.metrics.averageResponseTime =
          (this.metrics.averageResponseTime + responseTime) / 2;

        // Track slow requests (>2s)
        if (responseTime > 2000) {
          this.metrics.slowRequests++;
          console.warn(
            `Slow request detected: ${response.url} took ${responseTime}ms`,
          );
        }
      }

      // Track error rate
      if (!response.ok) {
        this.metrics.errorRate =
          (this.metrics.errorRate * (this.metrics.responseCount - 1) + 1) /
          this.metrics.responseCount;
      }

      return response;
    };
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      requestCount: 0,
      responseCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowRequests: 0,
    };
  }
}

// Usage
const monitor = new PerformanceMonitor();
client.useRequestMiddleware(monitor.createRequestMiddleware());
client.useResponseMiddleware(monitor.createResponseMiddleware());

// Check metrics periodically
setInterval(() => {
  const metrics = monitor.getMetrics();
  console.log("API Performance:", metrics);

  if (metrics.errorRate > 0.1) {
    // >10% error rate
    console.warn("High error rate detected!", metrics);
  }
}, 30000); // Every 30 seconds
```

## 🔐 CSRF + 401 Handling

The default export is pre-configured with:

- `credentials: 'same-origin'`
- CSRF token from `csrf_token` cookie
- 401 redirect to `/login?returnTo=...`

## 📋 Quick Copy-Paste Examples

### Basic Auth Token

```ts
import { FetchClient } from "@fgrzl/fetch";

const client = new FetchClient();
client.useRequestMiddleware(async (req, url) => {
  const token = localStorage.getItem("token");
  return [
    {
      ...req,
      headers: { ...req.headers, Authorization: `Bearer ${token}` },
    },
    url,
  ];
});

// Usage
const data = await client.get("/api/protected-resource");
```

### Request Logging

```ts
client.useRequestMiddleware(async (req, url) => {
  console.log(`🚀 ${req.method || "GET"} ${url}`);
  return [req, url];
});

client.useResponseMiddleware(async (res) => {
  console.log(`✅ ${res.status} ${res.url}`);
  return res;
});
```

### Automatic Retry

```ts
client.useResponseMiddleware(async (response) => {
  if (response.status >= 500 && response.status < 600) {
    console.log("Retrying request...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetch(response.url, response);
  }
  return response;
});
```

### Error Notifications

```ts
client.useResponseMiddleware(async (response) => {
  if (!response.ok) {
    const message = `Request failed: ${response.status} ${response.statusText}`;
    // Show toast notification, update UI, etc.
    console.error(message);
  }
  return response;
});
```

### Development Debug Headers

```ts
if (process.env.NODE_ENV === "development") {
  client.useRequestMiddleware(async (req, url) => {
    return [
      {
        ...req,
        headers: {
          ...req.headers,
          "X-Debug": "true",
          "X-Timestamp": new Date().toISOString(),
          "X-User-Agent": navigator.userAgent,
        },
      },
      url,
    ];
  });
}
```

### Simple Rate Limiting

```ts
let lastRequest = 0;
const RATE_LIMIT_MS = 1000; // 1 request per second

client.useRequestMiddleware(async (req, url) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequest;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest),
    );
  }

  lastRequest = Date.now();
  return [req, url];
});
```

## 🧪 Testing

```bash
npm run test
```

## 🛠 Build

```bash
npm run build
```

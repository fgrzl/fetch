# Error Handling

Comprehensive error handling strategies for robust applications.

## Response-Based Error Handling

@fgrzl/fetch uses response-based error handling instead of throwing exceptions for HTTP errors:

```typescript
const response = await api.get("/api/users");

if (response.ok) {
  // Success path
  console.log("Users:", response.data);
  // response.data is typed based on generic parameter
} else {
  // Error path
  console.error(`HTTP ${response.status}:`, response.error?.message);
  // response.error contains error details
}
```

## Custom Error Classes

For cases where you need exception-based handling, @fgrzl/fetch provides error classes:

```typescript
import { HttpError, NetworkError, FetchError } from "@fgrzl/fetch";

try {
  const response = await api.get("/api/users");
  // Note: HTTP errors don't throw by default
} catch (error) {
  if (error instanceof NetworkError) {
    // Network connectivity issues
    console.error("Network failed:", error.message);
    showOfflineMessage();
  } else if (error instanceof FetchError) {
    // Other fetch-related errors
    console.error("Request failed:", error.message);
  }
}
```

### Error Class Hierarchy

```typescript
FetchError              // Base class for all fetch errors
├── HttpError           // HTTP error responses (4xx, 5xx)
└── NetworkError        // Network failures (no connection, timeout)
```

### Error Properties

**HttpError:**

```typescript
class HttpError extends FetchError {
  status: number; // HTTP status code
  statusText: string; // HTTP status text
  headers: Headers; // Response headers
  url: string; // Request URL
}
```

**NetworkError:**

```typescript
class NetworkError extends FetchError {
  url: string; // Request URL that failed
}
```

## Error Handling Patterns

### Type-Safe Error Handling

```typescript
interface User {
  id: number;
  name: string;
}

const response = await api.get<User[]>("/api/users");

if (response.ok) {
  // TypeScript knows response.data is User[] | null
  response.data?.forEach((user) => console.log(user.name));
} else {
  // TypeScript knows response.error exists
  switch (response.status) {
    case 404:
      console.log("Users not found");
      break;
    case 401:
      redirectToLogin();
      break;
    case 500:
      console.error("Server error:", response.error?.message);
      break;
  }
}
```

### Global Error Handling

Set up global error handling with middleware:

```typescript
import { addAuthorization, addLogging } from "@fgrzl/fetch";

const client = addLogging(
  addAuthorization(new FetchClient(), {
    onUnauthorized: () => {
      // Global 401 handling
      localStorage.removeItem("auth-token");
      window.location.href = "/login";
    },
    onForbidden: () => {
      // Global 403 handling
      showNotification("Access denied", "error");
    },
  }),
  {
    level: "error", // Log all errors
  },
);
```

### Retry with Error Handling

```typescript
import { addRetry } from "@fgrzl/fetch";

const retryClient = addRetry(client, {
  maxRetries: 3,
  retryOn: [429, 502, 503, 504], // Which status codes to retry
  onRetry: (attempt, response) => {
    console.log(`Retry ${attempt}/3 for ${response.status}`);

    if (response.status === 429) {
      // Rate limited - extract retry-after header
      const retryAfter = response.headers.get("retry-after");
      console.log(`Rate limited, retry after ${retryAfter}s`);
    }
  },
});
```

## Error Context and Debugging

### Request Context in Errors

All errors include the original request context:

```typescript
const response = await api.post("/api/users", userData);

if (!response.ok) {
  console.error("Failed to create user:", {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    error: response.error,
  });
}
```

### Debug Mode

Enable verbose error logging in development:

```typescript
import { addDevelopmentStack } from "@fgrzl/fetch";

const devClient = addDevelopmentStack(new FetchClient(), {
  auth: { tokenProvider: () => getDevToken() },
});

// Includes detailed request/response logging
// Logs errors with full context
```

## Advanced Error Scenarios

### Timeout Handling

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await api.get(
    "/api/slow-endpoint",
    {},
    {
      signal: controller.signal,
    },
  );
  clearTimeout(timeoutId);

  if (response.ok) {
    console.log(response.data);
  }
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Request timed out");
  }
}
```

### Network Offline Detection

```typescript
try {
  const response = await api.get("/api/health");
} catch (error) {
  if (error instanceof NetworkError) {
    // Could be offline
    if (!navigator.onLine) {
      showOfflineIndicator();
    } else {
      // Network error but browser thinks we're online
      console.error("Network error:", error.message);
    }
  }
}
```

### Custom Error Processing

```typescript
const client = new FetchClient();

client.useResponseMiddleware(async (response) => {
  if (!response.ok && response.status >= 400) {
    // Parse error details from response body
    try {
      const errorData = await response.clone().json();

      // Enhance error with backend details
      if (response.error) {
        response.error.message = errorData.message || response.error.message;
        response.error.code = errorData.code;
        response.error.details = errorData.details;
      }
    } catch {
      // Couldn't parse error body, keep original error
    }
  }

  return response;
});
```

## Testing Error Scenarios

### Mocking Errors

```typescript
import { vi } from "vitest";

// Mock network error
global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

// Mock HTTP error
global.fetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    statusText: "Not Found",
  }),
);
```

### Testing Error Handling

```typescript
describe("Error Handling", () => {
  it("handles 404 responses gracefully", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

    const response = await api.get("/api/nonexistent");

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
    expect(response.data).toBeNull();
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(api.get("/api/test")).rejects.toThrow(NetworkError);
  });
});
```

## Best Practices

1. **Use response-based handling** for HTTP errors (4xx, 5xx)
2. **Use try/catch** only for network errors and exceptions
3. **Set up global error handling** with middleware
4. **Log errors appropriately** for debugging
5. **Provide user-friendly error messages** in production
6. **Test error scenarios** thoroughly
7. **Consider retry strategies** for transient failures

See also: [Middleware Guide](./middleware.md) for error handling middleware options.

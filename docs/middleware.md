# Middleware

This document explains how to use and compose request/response middleware in the fetch client.

## Built-in Middleware

### CSRF Protection
Automatically includes CSRF tokens in requests:

```ts
import { useCSRF } from "@fgrzl/fetch";

useCSRF(client, {
  cookieName: "csrf_token",
  headerName: "X-CSRF-Token",
});
```

### Authorization Redirect
Automatically redirects on 401 responses:

```ts
import { useAuthorization } from "@fgrzl/fetch";

useAuthorization(client, {
  url: "/login",
  param: "redirect_uri"
});
```

### Retry Middleware
Retries failed requests with configurable strategies:

```ts
import { createRetryMiddleware } from "@fgrzl/fetch";

// Basic retry for server errors (5xx) and rate limiting (429)
client.useResponseMiddleware(createRetryMiddleware());

// Custom retry configuration
client.useResponseMiddleware(createRetryMiddleware({
  maxRetries: 5,
  delay: 500,
  strategy: 'linear', // 'fixed', 'linear', or 'exponential'
  shouldRetry: (response) => response.status >= 400,
  onRetry: (response, attempt) => {
    console.log(`Retry attempt ${attempt} for ${response.status}`);
  }
}));

// Helper functions
client.useResponseMiddleware(createExponentialRetry(3, 1000));
client.useResponseMiddleware(createServerErrorRetry(5));
```

**Important**: The retry middleware has architectural limitations due to the response middleware pattern. See `docs/retry-limitations.md` for details and production considerations.

## Custom Middleware

### Request Middleware

Request middleware runs before the HTTP request is sent. You can modify request options and URLs.

```ts
client.useRequestMiddleware(async (req, url) => {
  // Add authentication header
  req.headers = {
    ...req.headers,
    'Authorization': `Bearer ${getToken()}`
  };
  
  return [req, url];
});
```

### Response Middleware

Response middleware runs after the HTTP response is received. You can process or modify responses.

```ts
client.useResponseMiddleware(async (response) => {
  // Log all responses
  console.log(`${response.status} ${response.url}`);
  
  // Return modified response
  return response;
});
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

# Custom Middleware

Create your own middleware to handle cross-cutting concerns like authentication, logging, and error handling using the unified intercept pattern.

## Unified Middleware Pattern

All middleware uses the same intercept pattern where you can modify requests before they're sent and process responses after they're received:

```ts
client.use(async (request, next) => {
  // 1. Modify request before sending
  request.headers = {
    ...request.headers,
    "X-Custom-Header": "value",
  };

  // 2. Call next middleware/make request
  const response = await next(request);

  // 3. Process response after receiving
  if (response.status >= 400) {
    console.error(`Request failed: ${response.status}`);
  }

  return response;
});
```

## Execution Order

Middleware executes in an onion-like pattern:

1. Middleware 1 (request processing)
2. Middleware 2 (request processing)
3. HTTP request
4. Middleware 2 (response processing, reverse order)
5. Middleware 1 (response processing, reverse order)

## Advanced Patterns

### Conditional Processing

```ts
client.use(async (request, next) => {
  const response = await next(request);

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
  return async (request, next) => {
    request.headers = { ...request.headers, Authorization: `Bearer ${token}` };
    return next(request);
  };
}

client.use(createAuthMiddleware(userToken));
```

See also: [Error Handling](../errors.md)

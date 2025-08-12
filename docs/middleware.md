# Middleware

This document explains how to use and compose request/response middleware in the fetch client.

## Request Middleware

Request middleware runs before the HTTP request is sent. You can modify request options and URLs.

```ts
client.useRequestMiddleware(async (req, url) => {
  // Modify request
  return [req, url];
});
```

## Response Middleware

Response middleware runs after the HTTP response is received. You can process or modify responses.

```ts
client.useResponseMiddleware(async (response) => {
  // Process response
  return response;
});
```

## Execution Order

Middlewares execute in the order they are registered.

## Advanced Patterns
- Conditional middleware
- Middleware composition
- Performance optimizations

See also: [Error Handling](./errors.md)

# Error Handling

This document covers error handling strategies for the fetch client, including custom error classes and middleware patterns.

## Custom Error Classes

- `HttpError`: Represents HTTP errors (non-2xx responses).
- `NetworkError`: Represents network failures (e.g., unreachable server).

## Usage Example

```ts
import { HttpError, NetworkError } from '@fgrzl/fetch';

try {
  const data = await client.get('/api/resource');
} catch (error) {
  if (error instanceof HttpError) {
    // Handle HTTP error
  } else if (error instanceof NetworkError) {
    // Handle network error
  }
}
```

## Error Middleware

You can use response middleware to map backend errors to user-friendly messages or to handle retries, logging, etc.

```ts
client.useResponseMiddleware(async (response) => {
  if (!response.ok) {
    // Map error or notify user
  }
  return response;
});
```

See also: [TypeScript Best Practices](./overview.md)

# Testing

This document describes how to test the fetch client and middleware using Vitest.

## Running Tests

```bash
npm run test
```

## Writing Tests

- Use Vitest for all unit tests.
- Test middleware, error handling, and client configuration.

## Example Test

```ts
import { describe, it, expect } from 'vitest';
import { fetch } from '../src/client';

describe('fetch client', () => {
  it('should return data for a valid request', async () => {
    const response = await fetch('https://api.example.com/data');
    expect(response.data).toBeDefined();
  });
});
```

See also: [Middleware](./middleware.md)

# Retry Middleware

The retry middleware retries failed responses that match a predicate.

## Usage

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addRetry } from '@fgrzl/fetch/middleware/retry';

const client = addRetry(new FetchClient(), {
  maxRetries: 3,
  delay: 1000,
  backoff: 'exponential',
});
```

## Options

```ts
interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: 'exponential' | 'linear' | 'fixed';
  maxDelay?: number;
  shouldRetry?: (response: FetchResponse<unknown>, attempt: number) => boolean;
  onRetry?: (
    attempt: number,
    delay: number,
    lastResponse: { status: number; statusText: string },
  ) => void;
}
```

Defaults:

- `maxRetries`: `3`
- `delay`: `1000`
- `backoff`: `exponential`
- `maxDelay`: `30000`
- `shouldRetry`: status `0` and HTTP `5xx`

## Custom Predicate

```ts
const client = addRetry(baseClient, {
  maxRetries: 2,
  shouldRetry: (response, attempt) => {
    if (attempt > 2) {
      return false;
    }

    return (
      response.status === 0 || response.status === 429 || response.status >= 500
    );
  },
});
```

## Retry Callback

```ts
const client = addRetry(baseClient, {
  onRetry: (attempt, delay, response) => {
    console.log(`Retry ${attempt} after ${delay}ms for ${response.status}`);
  },
});
```

## Limits

- Retries re-run the remaining middleware chain from the retry middleware's position.
- Middleware placed before retry runs once; middleware placed after retry runs for each attempt.
- Request bodies must be reusable by the runtime.
- Streaming request or response flows are not supported by the core client.
- Retries should be used carefully for non-idempotent operations.

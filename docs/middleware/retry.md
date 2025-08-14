# Retry Middleware

Automatically retries failed requests with configurable strategies and backoff algorithms.

## Usage

### Simple Retry

```ts
import { useRetry } from "@fgrzl/fetch";

// Default retry (3 retries with exponential backoff)
const retryClient = useRetry(client);

// Custom retry count
const retryClient = useRetry(client, {
  maxRetries: 5
});
```

### Advanced Configuration

```ts
import { useRetry, createRetryMiddleware } from "@fgrzl/fetch";

// Custom retry configuration
const retryClient = useRetry(client, {
  maxRetries: 5,
  delay: 1000,                    // Base delay in ms
  strategy: "exponential",        // 'fixed', 'linear', or 'exponential'
  shouldRetry: (response) => response.status >= 500 || response.status === 429,
  onRetry: (response, attempt) => {
    console.log(`Retry attempt ${attempt} for ${response.status}`);
  },
  maxDelay: 30000                 // Maximum delay cap
});

// Factory approach
const retryMiddleware = createRetryMiddleware({
  maxRetries: 3,
  strategy: "exponential"
});
client.use(retryMiddleware);
```

### Retry Strategies

```ts
// Fixed delay between retries
const fixedRetryClient = useRetry(client, {
  strategy: "fixed",
  delay: 2000,        // Always wait 2 seconds
  maxRetries: 3
});

// Linear backoff (delay increases linearly)  
const linearRetryClient = useRetry(client, {
  strategy: "linear",
  delay: 1000,        // 1s, 2s, 3s, 4s, ...
  maxRetries: 5
});

// Exponential backoff (default)
const exponentialRetryClient = useRetry(client, {
  strategy: "exponential",
  delay: 1000,        // 1s, 2s, 4s, 8s, 16s, ...
  maxRetries: 5,
  maxDelay: 30000     // Cap at 30 seconds
});
```

## Configuration Options

```ts
interface RetryOptions {
  maxRetries?: number;                    // Maximum retry attempts (default: 3)
  delay?: number;                         // Base delay in ms (default: 1000)
  strategy?: 'fixed' | 'linear' | 'exponential'; // Backoff strategy (default: 'exponential')
  maxDelay?: number;                      // Maximum delay cap in ms (default: 30000)
  shouldRetry?: (response: FetchResponse) => boolean; // Retry predicate
  onRetry?: (response: FetchResponse, attempt: number) => void; // Retry callback
  jitter?: boolean;                       // Add randomization (default: true)
}
```

### Default Retry Conditions

By default, requests are retried for:
- **5xx** server errors (500, 501, 502, 503, 504, etc.)
- **429** rate limiting
- **408** request timeout
- **Network errors** (connection failures, timeouts)

## Examples

### API Client with Retry

```ts
// Resilient API client
const apiClient = useRetry(new FetchClient(), {
  maxRetries: 3,
  shouldRetry: (response) => {
    // Retry on server errors, rate limits, and timeouts
    return response.status >= 500 || 
           response.status === 429 || 
           response.status === 408;
  },
  onRetry: (response, attempt) => {
    console.log(`API request failed (${response.status}), retrying... (${attempt}/3)`);
  }
});

const userData = await apiClient.get('/api/users/123');
```

### Custom Retry Logic

```ts
// Retry only specific operations
const selectiveRetryClient = useRetry(client, {
  shouldRetry: (response, request) => {
    // Only retry GET requests and certain endpoints
    return request.method === 'GET' &&
           response.status >= 500 &&
           request.url?.includes('/api/critical/');
  },
  maxRetries: 5,
  strategy: 'exponential'
});
```

### Retry with Jitter

```ts
// Add randomization to prevent thundering herd
const jitteredRetryClient = useRetry(client, {
  strategy: 'exponential',
  delay: 1000,
  jitter: true,  // Adds ±25% randomization
  maxRetries: 4
});

// Delays will be roughly: 1s±25%, 2s±25%, 4s±25%, 8s±25%
```

## Helper Functions

```ts
import { 
  createExponentialRetry, 
  createServerErrorRetry,
  createLinearRetry,
  createFixedRetry
} from "@fgrzl/fetch";

// Pre-configured retry strategies
client.use(createExponentialRetry(3, 1000));  // 3 retries, 1s base
client.use(createServerErrorRetry(5));        // 5 retries, server errors only
client.use(createLinearRetry(4, 500));        // Linear backoff
client.use(createFixedRetry(3, 2000));        // Fixed 2s delays
```

## Error Handling

### Final Failure

```ts
const retryClient = useRetry(client, {
  maxRetries: 3,
  onRetry: (response, attempt) => {
    console.log(`Attempt ${attempt} failed with status ${response.status}`);
  }
});

try {
  const response = await retryClient.get('/api/unreliable-endpoint');
  console.log('Success after retries:', response.data);
} catch (error) {
  console.error('All retry attempts failed:', error);
  // Handle final failure
}
```

### Retry Exhausted Callback

```ts
const retryClient = useRetry(client, {
  maxRetries: 3,
  onRetryExhausted: (lastResponse, totalAttempts) => {
    console.error(`All ${totalAttempts} attempts failed. Last response:`, lastResponse.status);
    // Log to error tracking service
    errorTracker.captureException(new Error(`API retry exhausted: ${lastResponse.status}`));
  }
});
```

## Integration Examples  

### Combined with Circuit Breaker Pattern

```ts
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute

  shouldRetry(): boolean {
    const now = Date.now();
    if (this.failures >= this.threshold) {
      if (now - this.lastFailureTime < this.timeout) {
        return false; // Circuit open
      }
      this.failures = 0; // Reset circuit
    }
    return true;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }
}

const circuitBreaker = new CircuitBreaker();

const resilientClient = useRetry(client, {
  shouldRetry: (response) => {
    if (!circuitBreaker.shouldRetry()) {
      console.log('Circuit breaker open, not retrying');
      return false;
    }
    
    const shouldRetry = response.status >= 500;
    if (shouldRetry) {
      circuitBreaker.recordFailure();
    } else {
      circuitBreaker.recordSuccess();
    }
    
    return shouldRetry;
  }
});
```

### Retry with Rate Limiting Awareness

```ts
const smartRetryClient = useRetry(client, {
  shouldRetry: (response) => {
    if (response.status === 429) {
      // Extract retry-after header
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const delay = parseInt(retryAfter) * 1000;
        console.log(`Rate limited, waiting ${delay}ms before retry`);
        return true;
      }
    }
    return response.status >= 500;
  },
  delay: (attempt, response) => {
    // Use Retry-After header if available for 429s
    if (response?.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        return parseInt(retryAfter) * 1000;
      }
    }
    // Otherwise use exponential backoff
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }
});
```

## Best Practices

1. **Appropriate retry conditions**: Don't retry client errors (4xx except 408, 429)
2. **Exponential backoff**: Prevents overwhelming already struggling servers
3. **Jitter**: Adds randomization to prevent thundering herd problems
4. **Maximum delay cap**: Prevents excessively long waits
5. **Idempotent operations**: Only retry safe operations (GET, PUT, DELETE)
6. **Circuit breaker**: Stop retrying if service is consistently failing
7. **Monitoring**: Log retry attempts for observability

## Limitations

⚠️ **Important**: The retry middleware has architectural limitations due to the response middleware pattern. 

- **Request consumption**: Request bodies may be consumed and not available for retries
- **Stream handling**: Streaming responses cannot be retried
- **Memory usage**: Large request/response bodies are kept in memory during retries

For production use with large payloads or streaming, consider implementing retry logic at the application level.

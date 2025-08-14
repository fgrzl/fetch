# Rate Limiting Middleware

Implements client-side rate limiting using token bucket algorithm to prevent overwhelming APIs and respect rate limits.

## Usage

### Simple Rate Limiting

```ts
import { useRateLimit } from "@fgrzl/fetch";

// Allow 100 requests per minute
const rateLimitedClient = useRateLimit(client, {
  requestsPerWindow: 100,
  windowMs: 60 * 1000, // 1 minute
});

// Default rate limiting (60 requests per minute)
const rateLimitedClient = useRateLimit(client);
```

### Advanced Configuration

```ts
import { useRateLimit, createRateLimitMiddleware } from "@fgrzl/fetch";

// Custom rate limiting with different strategies
const rateLimitedClient = useRateLimit(client, {
  requestsPerWindow: 1000,
  windowMs: 60 * 1000, // 1 minute window
  algorithm: "token-bucket", // or 'sliding-window'
  skipPatterns: ["/health", "/ping"],
  onRateLimited: (retryAfter) => {
    console.warn(`Rate limited. Retry after ${retryAfter}ms`);
  },
});

// Factory approach
const rateLimitMiddleware = createRateLimitMiddleware({
  requestsPerWindow: 500,
  windowMs: 30 * 1000, // 30 seconds
});
client.use(rateLimitMiddleware);
```

### Per-Endpoint Rate Limiting

```ts
// Different limits for different endpoints
const smartRateLimitedClient = useRateLimit(client, {
  keyGenerator: (request) => {
    if (request.url?.includes("/api/search")) return "search";
    if (request.url?.includes("/api/upload")) return "upload";
    return "default";
  },
  limits: {
    search: { requestsPerWindow: 10, windowMs: 60 * 1000 }, // 10/min for search
    upload: { requestsPerWindow: 5, windowMs: 60 * 1000 }, // 5/min for upload
    default: { requestsPerWindow: 100, windowMs: 60 * 1000 }, // 100/min default
  },
});
```

## Configuration Options

```ts
interface RateLimitOptions {
  requestsPerWindow?: number; // Requests allowed per window (default: 60)
  windowMs?: number; // Time window in milliseconds (default: 60000)
  algorithm?: RateLimitAlgorithm; // Algorithm to use (default: 'token-bucket')
  skipPatterns?: (RegExp | string)[]; // Patterns to skip rate limiting
  keyGenerator?: (request: RequestInit & { url: string }) => string; // Custom grouping
  onRateLimited?: (retryAfter: number) => void; // Called when rate limited
  storage?: RateLimitStorage; // Custom storage for distributed rate limiting
}

type RateLimitAlgorithm = "token-bucket" | "sliding-window" | "fixed-window";

interface RateLimitStorage {
  get(key: string): Promise<RateLimitEntry | undefined>;
  set(key: string, entry: RateLimitEntry, ttl: number): Promise<void>;
}
```

## Examples

### API Client with Rate Limiting

```ts
// Respect GitHub API rate limits (5000/hour for authenticated requests)
const githubClient = useRateLimit(new FetchClient(), {
  requestsPerWindow: 5000,
  windowMs: 60 * 60 * 1000, // 1 hour
  onRateLimited: (retryAfter) => {
    console.log(`GitHub API rate limit reached. Retry in ${retryAfter}ms`);
  },
});

// Use the client normally - rate limiting is automatic
const repos = await githubClient.get("/user/repos");
```

### Different Limits per Operation

```ts
// Different rate limits for read vs write operations
const apiClient = useRateLimit(client, {
  keyGenerator: (request) => {
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(
      request.method || "GET",
    );
    return isWrite ? "write" : "read";
  },
  limits: {
    read: { requestsPerWindow: 1000, windowMs: 60 * 1000 }, // 1000/min reads
    write: { requestsPerWindow: 100, windowMs: 60 * 1000 }, // 100/min writes
  },
});
```

### Distributed Rate Limiting with Redis

```ts
class RedisRateLimitStorage implements RateLimitStorage {
  async get(key: string): Promise<RateLimitEntry | undefined> {
    const data = await redis.get(`rateLimit:${key}`);
    return data ? JSON.parse(data) : undefined;
  }

  async set(key: string, entry: RateLimitEntry, ttl: number): Promise<void> {
    await redis.setex(`rateLimit:${key}`, ttl / 1000, JSON.stringify(entry));
  }
}

// Shared rate limiting across multiple instances
const distributedClient = useRateLimit(client, {
  storage: new RedisRateLimitStorage(),
  requestsPerWindow: 1000,
  windowMs: 60 * 1000,
});
```

## Rate Limiting Algorithms

### Token Bucket (Default)

```ts
// Allows burst traffic up to bucket size, then steady rate
const burstClient = useRateLimit(client, {
  algorithm: "token-bucket",
  requestsPerWindow: 100, // Bucket size
  windowMs: 60 * 1000, // Refill rate (100 tokens per minute)
  burstSize: 20, // Allow 20 requests immediately
});
```

### Sliding Window

```ts
// Smooth rate limiting over a sliding time window
const smoothClient = useRateLimit(client, {
  algorithm: "sliding-window",
  requestsPerWindow: 100,
  windowMs: 60 * 1000,
});
```

### Fixed Window

```ts
// Simple fixed-window rate limiting
const simpleClient = useRateLimit(client, {
  algorithm: "fixed-window",
  requestsPerWindow: 100,
  windowMs: 60 * 1000, // Resets every minute
});
```

## Error Handling

### Rate Limit Exceeded

```ts
const rateLimitedClient = useRateLimit(client, {
  requestsPerWindow: 10,
  windowMs: 60 * 1000,
  onRateLimited: (retryAfter) => {
    // Custom handling when rate limit is hit
    throw new Error(`Rate limit exceeded. Retry after ${retryAfter}ms`);
  },
});

try {
  const response = await rateLimitedClient.get("/api/data");
} catch (error) {
  if (error.message.includes("Rate limit exceeded")) {
    // Handle rate limit error
    const retryAfter = parseInt(error.message.match(/(\d+)ms/)?.[1] || "60000");
    setTimeout(() => {
      // Retry the request
    }, retryAfter);
  }
}
```

### Graceful Degradation

```ts
const resilientClient = useRateLimit(client, {
  onRateLimited: async (retryAfter) => {
    // Wait and retry automatically
    await new Promise((resolve) => setTimeout(resolve, retryAfter));
  },
});
```

## Integration Examples

### Combined with Retry Middleware

```ts
import { useRateLimit, useRetry } from "@fgrzl/fetch";

// Rate limiting with intelligent retries
const resilientClient = useRetry(
  useRateLimit(client, {
    requestsPerWindow: 100,
    windowMs: 60 * 1000,
  }),
  {
    maxRetries: 3,
    shouldRetry: (response) => response.status === 429, // Retry on rate limit
    delay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000), // Exponential backoff
  },
);
```

### Real-time Applications

```ts
// Rate limit WebSocket-like polling
const pollingClient = useRateLimit(client, {
  requestsPerWindow: 60, // Once per second
  windowMs: 60 * 1000,
  keyGenerator: () => "polling", // Single rate limit for all polling
  onRateLimited: (retryAfter) => {
    console.log(`Polling rate limited, slowing down by ${retryAfter}ms`);
  },
});

// Polling loop
setInterval(async () => {
  try {
    const updates = await pollingClient.get("/api/updates");
    handleUpdates(updates.data);
  } catch (error) {
    console.error("Polling failed:", error);
  }
}, 1000);
```

## Best Practices

1. **Respect API limits**: Set limits based on API documentation
2. **Use appropriate algorithms**: Token bucket for burst, sliding window for smooth
3. **Handle rate limit errors**: Always have error handling for rate limits
4. **Monitor usage**: Log rate limit hits to understand usage patterns
5. **Distribute limits**: Use per-endpoint or per-user rate limits when appropriate
6. **Graceful degradation**: Handle rate limits gracefully without breaking UX
7. **Server-side coordination**: Use distributed storage for multi-instance apps

## Performance Considerations

- **Memory usage**: In-memory storage grows with number of rate limit keys
- **Storage overhead**: Distributed storage adds latency to requests
- **Algorithm choice**: Token bucket allows bursts, sliding window is smoother
- **Cleanup**: Expired entries are automatically cleaned up

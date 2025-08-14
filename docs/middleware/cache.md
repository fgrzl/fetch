# Cache Middleware

Provides intelligent response caching with TTL (Time To Live) support for improved performance and reduced API calls.

## Usage

### Simple Caching

```ts
import { useCache } from "@fgrzl/fetch";

// Cache responses for 5 minutes
const cachedClient = useCache(client, {
  ttl: 5 * 60 * 1000 // 5 minutes in milliseconds
});

// Default caching (1 minute TTL)
const cachedClient = useCache(client);
```

### Advanced Configuration

```ts
import { useCache, createCacheMiddleware } from "@fgrzl/fetch";

// Custom cache configuration
const cachedClient = useCache(client, {
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 1000, // Maximum 1000 cached responses
  keyGenerator: (request) => `${request.method}-${request.url}`,
  shouldCache: (response) => response.status === 200 && response.method === 'GET'
});

// Factory approach for advanced control
const cacheMiddleware = createCacheMiddleware({
  ttl: 30 * 1000, // 30 seconds
  storage: new Map(), // Custom storage implementation
});
client.use(cacheMiddleware);
```

### Custom Storage

```ts
// Using custom storage backend
import { useCache } from "@fgrzl/fetch";

class RedisCache implements CacheStorage {
  async get(key: string): Promise<CacheEntry | undefined> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : undefined;
  }
  
  async set(key: string, entry: CacheEntry): Promise<void> {
    await redis.setex(key, entry.ttl / 1000, JSON.stringify(entry));
  }
  
  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
  
  async clear(): Promise<void> {
    await redis.flushall();
  }
}

const cachedClient = useCache(client, {
  storage: new RedisCache(),
  ttl: 15 * 60 * 1000 // 15 minutes
});
```

## Configuration Options

```ts
interface CacheOptions {
  ttl?: number;                    // Time to live in milliseconds (default: 60000)
  maxSize?: number;                // Maximum cache entries (default: 1000)
  storage?: CacheStorage;          // Custom storage implementation
  keyGenerator?: CacheKeyGenerator; // Custom cache key generation
  shouldCache?: (response: FetchResponse) => boolean; // Cache predicate
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  headers: HeadersInit;
  status: number;
  statusText: string;
}

interface CacheStorage {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

type CacheKeyGenerator = (request: RequestInit & { url: string }) => string;
```

## Examples

### API Response Caching

```ts
// Cache GET requests for user data
const userClient = useCache(new FetchClient(), {
  ttl: 2 * 60 * 1000, // 2 minutes
  shouldCache: (response) => 
    response.method === 'GET' && 
    response.url?.includes('/api/users') &&
    response.status === 200
});

const userData = await userClient.get('/api/users/123');
// Subsequent calls within 2 minutes will be served from cache
```

### Cache Invalidation

```ts
// Manual cache clearing
const client = useCache(new FetchClient());

// Clear entire cache
await client.cache.clear();

// Clear specific entry (if you have access to the cache instance)
await client.cache.delete('GET-/api/users/123');
```

### Per-Request Cache Control

```ts
// Skip cache for specific requests
const response = await cachedClient.get('/api/fresh-data', {
  headers: {
    'Cache-Control': 'no-cache' // Will bypass cache
  }
});

// Force cache refresh
const response = await cachedClient.get('/api/data', {
  headers: {
    'Cache-Control': 'max-age=0' // Will refresh cache
  }
});
```

## Cache Strategies

### Time-based Caching

```ts
// Different TTLs for different endpoints
const smartClient = useCache(client, {
  keyGenerator: (req) => `${req.method}-${req.url}`,
  shouldCache: (response) => response.status < 400,
  ttl: (request) => {
    if (request.url?.includes('/api/config')) return 30 * 60 * 1000; // 30 min
    if (request.url?.includes('/api/users')) return 5 * 60 * 1000;   // 5 min
    return 60 * 1000; // 1 min default
  }
});
```

### Conditional Caching

```ts
// Only cache successful GET requests
const conditionalClient = useCache(client, {
  shouldCache: (response) => 
    response.method === 'GET' && 
    response.status >= 200 && 
    response.status < 300 &&
    !response.url?.includes('?nocache=true')
});
```

## Best Practices

1. **Cache GET requests only**: POST/PUT/DELETE should not be cached
2. **Set appropriate TTLs**: Balance freshness vs performance
3. **Use custom storage**: For shared caches or persistence
4. **Handle cache misses**: Always be prepared for network requests  
5. **Cache invalidation**: Clear cache after mutations
6. **Memory management**: Set `maxSize` to prevent memory leaks
7. **Error handling**: Don't cache error responses unless intentional

## Performance Considerations

- **Memory usage**: Default in-memory storage grows with cache size
- **TTL cleanup**: Expired entries are cleaned up automatically
- **Network fallback**: Cache misses fall through to network requests
- **Serialization**: Custom storage may have serialization overhead

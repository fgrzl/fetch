# Troubleshooting

Common issues and solutions when using @fgrzl/fetch.

## Installation Issues

### Package Not Found

**Problem:** `npm install @fgrzl/fetch` fails with "package not found"

**Solution:**

```bash
# Try clearing npm cache
npm cache clean --force
npm install @fgrzl/fetch

# Or use yarn
yarn add @fgrzl/fetch
```

### TypeScript Errors After Installation

**Problem:** TypeScript can't find module declarations

**Solution:**

```bash
# Ensure TypeScript is installed
npm install -D typescript

# Check tsconfig.json includes node_modules
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## Import Issues

### Cannot Import Default Export

**Problem:**

```typescript
import api from "@fgrzl/fetch"; // ❌ Error: Module has no default export
```

**Solution:** Check your module system configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

Or use named imports:

```typescript
import { FetchClient } from "@fgrzl/fetch";
const api = new FetchClient();
```

### Middleware Import Errors

**Problem:**

```typescript
import { useAuthentication } from "@fgrzl/fetch/middleware"; // ❌ Not found
```

**Solution:** Import from main module:

```typescript
import { useAuthentication } from "@fgrzl/fetch"; // ✅ Correct
```

## Runtime Issues

### CSRF Token Not Found

**Problem:** Requests failing with CSRF errors despite using `useCSRF`

**Symptoms:**

- 403 Forbidden responses
- "CSRF token mismatch" errors
- Missing X-XSRF-TOKEN header

**Solutions:**

1. **Check cookie availability:**

```typescript
// Debug: Check if cookie exists
document.cookie.split(";").forEach((cookie) => {
  console.log(cookie.trim());
});

// Verify XSRF-TOKEN cookie is present
```

2. **Custom token provider:**

```typescript
const csrfClient = useCSRF(client, {
  tokenProvider: () => {
    // Get token from meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag?.getAttribute("content") || "";
  },
});
```

3. **Check cookie domain/path:**

```typescript
// Ensure cookies are accessible to your domain
const csrfClient = useCSRF(client, {
  cookieName: "XSRF-TOKEN", // Verify exact name
  skipPatterns: ["/api/auth/*"], // Skip for login endpoints
});
```

### Authentication Token Not Included

**Problem:** Requests missing Authorization header

**Symptoms:**

- 401 Unauthorized responses
- Missing Authorization header in requests

**Solutions:**

1. **Debug token provider:**

```typescript
const authClient = useAuthentication(client, {
  tokenProvider: () => {
    const token = localStorage.getItem("auth-token");
    console.log("Token:", token); // Debug log
    return token || "";
  },
});
```

2. **Check token storage:**

```typescript
// Verify token is stored correctly
console.log("Stored token:", localStorage.getItem("auth-token"));

// Check for async token retrieval
const authClient = useAuthentication(client, {
  tokenProvider: async () => {
    const token = await getTokenFromSecureStorage();
    if (!token) {
      throw new Error("No authentication token available");
    }
    return token;
  },
});
```

3. **Custom header configuration:**

```typescript
// If API uses different auth header
const authClient = useAuthentication(client, {
  tokenProvider: () => getApiKey(),
  headerName: "X-API-Key",
  authScheme: "ApiKey",
});
```

### Requests Hanging or Timing Out

**Problem:** Requests never resolve or take too long

**Symptoms:**

- Requests hang indefinitely
- No response or error thrown

**Solutions:**

1. **Add request timeout:**

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await api.get(
    "/api/data",
    {},
    {
      signal: controller.signal,
    },
  );
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Request timed out");
  }
}
```

2. **Check network connectivity:**

```typescript
// Debug network issues
const response = await api.get("/api/health");
if (!response.ok) {
  console.log("API health check failed:", response.status);
}
```

3. **Enable debug logging:**

```typescript
import { useDevelopmentStack } from "@fgrzl/fetch";

const debugClient = useDevelopmentStack(client, {
  auth: { tokenProvider: () => getToken() },
});
// Will log all requests and responses
```

## CORS Issues

### Cross-Origin Request Blocked

**Problem:** Browser blocks requests to different domain

**Symptoms:**

- CORS errors in browser console
- Network errors for cross-origin requests

**Solutions:**

1. **Check CORS headers on server:**

```javascript
// Server should include:
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization, X-XSRF-TOKEN
Access-Control-Allow-Credentials: true
```

2. **Configure client credentials:**

```typescript
// For cookie-based auth
const client = new FetchClient({
  credentials: "include", // Send cookies cross-origin
});

// For token-only auth
const client = new FetchClient({
  credentials: "omit", // Don't send cookies
});
```

3. **Use proxy in development:**

```json
// package.json (Create React App)
{
  "proxy": "http://localhost:3001"
}

// Or use Vite proxy
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

### Base URL Configuration Issues

**Problem:** Requests going to wrong URLs or base URL not working

**Symptoms:**

- 404 errors when base URL is configured
- Relative URLs not being resolved correctly
- Absolute URLs being modified unexpectedly

**Solutions:**

1. **Check base URL format:**

```typescript
// ✅ Correct formats
const client1 = new FetchClient({ baseUrl: "https://api.example.com" });
const client2 = new FetchClient({ baseUrl: "https://api.example.com/" }); // Trailing slash OK

// ❌ Invalid formats
const badClient = new FetchClient({ baseUrl: "api.example.com" }); // Missing protocol
```

2. **Verify URL resolution:**

```typescript
const client = new FetchClient({ baseUrl: "https://api.example.com" });

// These should work:
await client.get("/users"); // → https://api.example.com/users
await client.get("users"); // → https://api.example.com/users
await client.get("https://other-api.com/data"); // → https://other-api.com/data (absolute)

// Debug URL resolution
console.log("Making request to:", "/users");
const response = await client.get("/users");
```

3. **Environment-specific debugging:**

```typescript
const getBaseUrl = () => {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3001";
  console.log("Using base URL:", baseUrl);
  return baseUrl;
};

const client = new FetchClient({ baseUrl: getBaseUrl() });
```

4. **Check for conflicting absolute URLs:**

```typescript
// If you expect base URL to be used but it's not:
// ❌ This will NOT use base URL (absolute URL)
await client.get("http://localhost:3000/api/users");

// ✅ This WILL use base URL (relative URL)
await client.get("/api/users");
```

## Middleware Issues

### Middleware Order Problems

**Problem:** Middleware not working as expected

**Solution:** Check middleware order:

```typescript
// ✅ Correct order: Auth → Cache → Retry → Logging
const client = useLogging(
  useRetry(useCache(useAuthentication(baseClient, authConfig))),
);

// ❌ Wrong order: Auth after retry won't work for retried requests
const badClient = useAuthentication(useRetry(baseClient), authConfig);
```

### Rate Limiting Triggered

**Problem:** Getting 429 Too Many Requests errors

**Solutions:**

1. **Check rate limits:**

```typescript
const limitedClient = useRateLimit(client, {
  maxRequests: 50, // Reduce if hitting limits
  windowMs: 60 * 1000,
  onLimitReached: (retryAfter) => {
    console.log(`Rate limited, wait ${retryAfter}ms`);
  },
});
```

2. **Implement backoff:**

```typescript
const retryClient = useRetry(client, {
  maxRetries: 3,
  delay: 1000,
  backoff: "exponential",
  retryOn: [429], // Retry rate limit errors
});
```

## Performance Issues

### Slow Response Times

**Problem:** API calls are slower than expected

**Solutions:**

1. **Check cache configuration:**

```typescript
// Enable caching for GET requests
const cachedClient = useCache(client, {
  ttl: 5 * 60 * 1000, // 5 minutes
  methods: ["GET", "HEAD"],
});
```

2. **Optimize logging:**

```typescript
// Reduce logging in production
const prodClient = useLogging(client, {
  level: "error", // Only log errors
  includeRequestBody: false,
  includeResponseBody: false,
});
```

3. **Monitor request metrics:**

```typescript
// Add timing logs
const response = await api.get("/api/data");
console.log("Request duration:", response.timing?.duration);
```

### Memory Leaks

**Problem:** Memory usage grows over time

**Solutions:**

1. **Check cache size:**

```typescript
// Limit cache size
const cachedClient = useCache(client, {
  maxSize: 100, // Limit cached responses
  ttl: 5 * 60 * 1000,
});
```

2. **Clean up AbortControllers:**

```typescript
const controllers = new Set<AbortController>();

function makeRequest(url: string) {
  const controller = new AbortController();
  controllers.add(controller);

  return api.get(url, {}, { signal: controller.signal }).finally(() => {
    controllers.delete(controller);
  });
}

// Clean up on component unmount
function cleanup() {
  controllers.forEach((controller) => controller.abort());
  controllers.clear();
}
```

## Development vs Production Issues

### Different Behavior in Production

**Problem:** Code works in development but fails in production

**Solutions:**

1. **Environment-specific configuration:**

```typescript
const isProd = process.env.NODE_ENV === "production";

const client = isProd
  ? useProductionStack(new FetchClient(), {
      auth: { tokenProvider: () => getSecureToken() },
      logging: { level: "error" },
    })
  : useDevelopmentStack(new FetchClient(), {
      auth: { tokenProvider: () => "dev-token" },
    });
```

2. **Check build configuration:**

```json
// Ensure types are included in build
{
  "files": ["dist"],
  "types": "dist/index.d.ts"
}
```

## Getting Help

### Enable Debug Logging

```typescript
import { useDevelopmentStack } from "@fgrzl/fetch";

const debugClient = useDevelopmentStack(new FetchClient(), {
  auth: { tokenProvider: () => getToken() },
});

// This will log:
// → GET /api/users (request details)
// ← GET /api/users → 200 (response details)
```

### Create Minimal Reproduction

When reporting issues, create a minimal example:

```typescript
import { FetchClient } from "@fgrzl/fetch";

// Minimal reproduction of the issue
const client = new FetchClient();
const response = await client.get("https://api.example.com/test");
console.log({ ok: response.ok, status: response.status });
```

### Check Browser Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Make the failing request
4. Check:
   - Request headers (Authorization, X-XSRF-TOKEN)
   - Response status and headers
   - Timing information

### Common Environment Variables

```bash
# Enable detailed logging
DEBUG=@fgrzl/fetch:*

# Node.js specific
NODE_ENV=development
```

If you're still experiencing issues, please create an issue on GitHub with:

- Minimal reproduction code
- Expected vs actual behavior
- Browser/Node.js version
- Network tab screenshots (if applicable)

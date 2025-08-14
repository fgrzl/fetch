# Authentication Middleware

Automatically adds authentication headers to requests using bearer tokens or custom authentication schemes.

## Usage

### Simple Bearer Token

```ts
import { useAuthentication } from "@fgrzl/fetch";

// Static token
const authClient = useAuthentication(client, {
  tokenProvider: () => "your-bearer-token",
});

// Dynamic token from localStorage
const authClient = useAuthentication(client, {
  tokenProvider: () => localStorage.getItem("auth-token") || "",
});

// With custom header name
const authClient = useAuthentication(client, {
  tokenProvider: () => getApiKey(),
  headerName: "X-API-Key",
});
```

### Custom Authentication Schemes

```ts
// Custom authorization header
const authClient = useAuthentication(client, {
  tokenProvider: () => `Bearer ${getToken()}`,
  headerName: "Authorization", // Default
});

// API Key authentication
const authClient = useAuthentication(client, {
  tokenProvider: () => process.env.API_KEY,
  headerName: "X-API-Key",
});
```

### Advanced Usage

```ts
import { createAuthenticationMiddleware } from "@fgrzl/fetch";

// Skip authentication for certain endpoints
const authClient = useAuthentication(client, {
  tokenProvider: () => getToken(),
  skipPatterns: ["/public", /^\/health/],
});

// Advanced factory usage
const authMiddleware = createAuthenticationMiddleware({
  tokenProvider: async () => {
    const token = await refreshTokenIfNeeded();
    return token;
  },
  headerName: "Authorization",
});

client.use(authMiddleware);
```

## Configuration Options

```ts
interface AuthenticationOptions {
  tokenProvider: AuthTokenProvider;
  headerName?: string; // Default: 'Authorization'
  skipPatterns?: (RegExp | string)[];
}

type AuthTokenProvider = () => string | Promise<string>;
```

### Options

- **`tokenProvider`** (required): Function that returns the authentication token
- **`headerName`** (optional): Name of the header to add (default: `'Authorization'`)
- **`skipPatterns`** (optional): URL patterns to skip authentication for

## Examples

### React Integration

```tsx
import { useAuthentication } from "@fgrzl/fetch";

function createAuthenticatedClient(getToken: () => string) {
  return useAuthentication(new FetchClient(), {
    tokenProvider: getToken,
  });
}

// In your React app
const apiClient = createAuthenticatedClient(
  () => localStorage.getItem("authToken") || "",
);
```

### Next.js API Routes

```ts
// pages/api/proxy.ts
import { useAuthentication } from "@fgrzl/fetch";

const authenticatedClient = useAuthentication(new FetchClient(), {
  tokenProvider: () => process.env.SERVICE_API_KEY!,
  headerName: "X-Service-Key",
});
```

## Best Practices

1. **Async token providers**: Use async functions if you need to refresh tokens
2. **Error handling**: Token provider errors are propagated to the request
3. **Security**: Never log or expose tokens in client-side code
4. **Skip patterns**: Use for public endpoints that don't need authentication

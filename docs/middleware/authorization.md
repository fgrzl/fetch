# Authorization Middleware

Automatically handles HTTP 401 Unauthorized and 403 Forbidden responses with intelligent defaults for authentication flows.

## Quick Start

### Smart Defaults (Zero Config)

```ts
import { useAuthorization } from "@fgrzl/fetch";

// ✨ Ultimate simplicity - redirects to '/login?return_url=current-page' on 401
const authClient = useAuthorization(client);
```

### Custom Configuration

```ts
// Custom redirect path
useAuthorization(client, {
  redirectConfig: {
    redirectPath: "/signin", // Default: "/login"
    returnUrlParam: "redirect_to", // Default: "return_url"
  },
});

// Disable return URL if not needed
useAuthorization(client, {
  redirectConfig: {
    redirectPath: "/login",
    includeReturnUrl: false, // Default: true
  },
});

// Works with existing query parameters
useAuthorization(client, {
  redirectConfig: {
    redirectPath: "/login?theme=dark&lang=en",
    // Results in: /login?theme=dark&lang=en&return_url=current-page
  },
});
```

## Manual Handlers

For complete control over unauthorized responses:

```ts
// Custom handler (overrides smart defaults)
useAuthorization(client, {
  onUnauthorized: (response, request) => {
    localStorage.removeItem("auth-token");
    window.location.href = "/login";
  },
});

// Handle both 401 and 403 responses
useAuthorization(client, {
  onForbidden: (response) => {
    showAccessDeniedMessage();
  },
  statusCodes: [401, 403], // Default: [401]
});
```

## Advanced Configuration

```ts
// Skip authorization for certain endpoints
useAuthorization(client, {
  skipPatterns: ["/login", "/register", /^\/public\//],
});

// Advanced usage with factory
import { createAuthorizationMiddleware } from "@fgrzl/fetch";

const authMiddleware = createAuthorizationMiddleware({
  redirectConfig: { redirectPath: "/signin" },
});
client.use(authMiddleware);
```

## Configuration Options

```ts
interface AuthorizationOptions {
  onUnauthorized?: UnauthorizedHandler;
  redirectConfig?: RedirectAuthorizationConfig;
  onForbidden?: UnauthorizedHandler;
  skipPatterns?: (RegExp | string)[];
  statusCodes?: number[]; // Default: [401]
}

interface RedirectAuthorizationConfig {
  redirectPath?: string; // Default: '/login'
  returnUrlParam?: string; // Default: 'return_url'
  includeReturnUrl?: boolean; // Default: true
}

type UnauthorizedHandler = (
  response: FetchResponse<unknown>,
  request: RequestInit & { url?: string },
) => void | Promise<void>;
```

## Integration Examples

### React Router

```tsx
import { useAuthorization } from "@fgrzl/fetch";

// Smart defaults work perfectly with React Router
const apiClient = useAuthorization(new FetchClient());

// After successful login, redirect back:
function LoginPage() {
  const [searchParams] = useSearchParams();

  const handleLogin = async () => {
    await login();
    const returnUrl = searchParams.get("return_url");
    if (returnUrl) {
      window.location.href = decodeURIComponent(returnUrl);
    } else {
      navigate("/dashboard");
    }
  };
}
```

### Next.js

```ts
// Smart defaults work with Next.js
const apiClient = useAuthorization(new FetchClient());

// In your login API route:
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // After authentication success...
  const returnUrl = req.query.return_url as string;
  if (returnUrl) {
    res.redirect(decodeURIComponent(returnUrl));
  } else {
    res.redirect("/dashboard");
  }
}
```

## Priority Rules

1. **Explicit handler wins**: `onUnauthorized` takes precedence over `redirectConfig`
2. **Smart defaults**: No config needed - automatically redirects with return URL
3. **Status codes**: Defaults to `[401]`, customize with `statusCodes` option

## Best Practices

1. **Use smart defaults** for most cases - they handle common auth flows
2. **Validate return URLs** on your backend to prevent open redirect attacks
3. **Clear auth tokens** before redirecting to prevent stale sessions
4. **Use HTTPS** in production to protect return URL parameters
5. **Test SSR compatibility** - middleware is server-side safe

📖 **For complete examples and integration guides, see [Authorization Middleware](./authorization-middleware.md)**

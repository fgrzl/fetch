# Middleware Organization

This directory contains all middleware for the fetch client. Each middleware is organized in its own folder following a consistent pattern.

## Structure Pattern

Each middleware should follow this structure:

```
middleware/
├── <middleware-name>/
│   ├── index.ts           # Main implementation
│   ├── types.ts           # TypeScript type definitions
│   ├── <name>.test.ts     # Unit tests
│   ├── <name>.ts          # Re-export with documentation (optional)
│   └── README.md          # Middleware-specific documentation (optional)
└── index.ts               # Main middleware exports
```

## Example New Middleware

To add a new middleware (e.g., `rate-limiting`):

1. Create the folder: `mkdir middleware/rate-limiting`
2. Create the files:
   - `index.ts` - Main implementation
   - `types.ts` - Type definitions
   - `rate-limiting.test.ts` - Tests
3. Add exports to `middleware/index.ts`
4. Add exports to main `src/index.ts` if public

## Current Middleware

### CSRF Protection (`csrf/`)

- Provides CSRF token handling
- Uses XSRF-TOKEN/X-XSRF-TOKEN by default
- Configurable cookie and header names

### Authorization Redirect (`authorization/`)

- Handles 401 responses with automatic redirects
- Uses OAuth 2.0 redirect_uri parameter by default
- Configurable login URL and return parameter

## Import Patterns

```typescript
// From main package
import { useCSRF, useAuthorization } from "@fgrzl/fetch";

// From middleware directly
import { useCSRF } from "@fgrzl/fetch/middleware";

// Individual middleware
import { useCSRF } from "@fgrzl/fetch/middleware/csrf";
```

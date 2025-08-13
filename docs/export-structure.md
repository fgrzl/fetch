# Export Structure: Pit of Success

This document explains the "pit of success" export structure that guides users toward best practices.

## Main Entry Point Philosophy

The `src/index.ts` follows a carefully designed "pit of success" pattern:

### 🎯 Level 1: Pre-configured Client (80% of users)
```typescript
import api from '@fgrzl/fetch';

// Just works - no configuration needed!
const users = await api.get('/api/users');
```

**What:** Default export with sensible defaults (CSRF + auth redirect)  
**Why:** Most users just want it to work out of the box  
**Success:** Zero configuration, maximum functionality

### 🎯 Level 2: Custom Client Creation (15% of users)
```typescript
import { FetchClient, useCSRF, useAuthorization, useRetry } from '@fgrzl/fetch';

const client = new FetchClient(config);
useCSRF(client);
```

**What:** Core classes and middleware functions  
**Why:** Users who need custom configuration discover these naturally  
**Success:** Clean, consistent API across all middleware

### 🎯 Level 3: TypeScript Integration (TypeScript users)
```typescript
import type { FetchClientConfig, CSRFOptions } from '@fgrzl/fetch';
```

**What:** Type definitions for configuration objects  
**Why:** IntelliSense guides users to correct usage  
**Success:** Type safety without learning complex APIs

### 🎯 Level 4: Error Handling (As needed)
```typescript
import { HttpError, NetworkError } from '@fgrzl/fetch';
```

**What:** Error classes for sophisticated error handling  
**Why:** Advanced users discover these when they need them  
**Success:** Powerful error handling without overwhelming beginners

## Benefits

1. **Discoverability**: Users find what they need naturally
2. **Consistency**: All middleware follow the same pattern
3. **Progressive Enhancement**: Simple → configured → advanced
4. **Type Safety**: TypeScript guides correct usage
5. **Tree Shaking**: Advanced users can import selectively
6. **Cognitive Load**: Simple concepts don't require complex APIs

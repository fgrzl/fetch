# Getting Started

Welcome to @fgrzl/fetch! This guide will get you up and running quickly.

## Installation

```bash
npm install @fgrzl/fetch
```

## Your First Request

The fastest way to make an API call:

```typescript
import api from "@fgrzl/fetch";

const response = await api.get("/api/users");
console.log(response.data);
```

That's it! The default client includes:
- ✅ CSRF protection
- ✅ Automatic retries 
- ✅ Request logging
- ✅ Error handling
- ✅ TypeScript support

## Basic Usage Patterns

### GET with Query Parameters

```typescript
const users = await api.get("/api/users", { 
  status: "active", 
  limit: 10 
});
// → GET /api/users?status=active&limit=10
```

### POST with Data

```typescript
const newUser = await api.post("/api/users", {
  name: "John Doe",
  email: "john@example.com"
});
```

### Error Handling

```typescript
const response = await api.get("/api/users");

if (response.ok) {
  console.log("Success:", response.data);
} else {
  console.error(`Error ${response.status}:`, response.error?.message);
}
```

### TypeScript Support

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const response = await api.get<User[]>("/api/users");
if (response.ok) {
  // response.data is now typed as User[]
  response.data.forEach(user => console.log(user.name));
}
```

## What's Next?

- **Need authentication?** → [Configuration Guide](./configuration.md)
- **Want custom middleware?** → [Middleware Guide](./middleware.md)
- **Building a production app?** → [Architecture Guide](./architecture.md)

## Common Questions

**Q: Do I need to configure anything?**  
A: Nope! The default client works out of the box for most use cases.

**Q: How do I add authentication?**  
A: See the [Configuration Guide](./configuration.md) for token-based auth setup.

**Q: Can I customize retry behavior?**  
A: Yes! Check out [Middleware Guide](./middleware.md) for custom retry strategies.
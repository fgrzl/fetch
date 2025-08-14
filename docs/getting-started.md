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
  limit: 10,
});
// → GET /api/users?status=active&limit=10
```

### POST with Data

```typescript
const newUser = await api.post("/api/users", {
  name: "John Doe",
  email: "john@example.com",
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
  response.data.forEach((user) => console.log(user.name));
}
```

## Working with APIs

### Setting Up a Base URL

When working with a specific API, set a base URL to avoid repeating the domain:

```typescript
import { FetchClient } from "@fgrzl/fetch";

// Create a client for your API
const apiClient = new FetchClient({
  baseUrl: "https://api.example.com",
});

// Now all relative URLs are prefixed automatically
const users = await apiClient.get("/users");        // → GET https://api.example.com/users
const posts = await apiClient.get("/posts?page=1"); // → GET https://api.example.com/posts?page=1

// Create new resources
const newPost = await apiClient.post("/posts", {
  title: "Hello World",
  content: "My first post!"
}); // → POST https://api.example.com/posts
```

### Multiple APIs

Create different clients for different services:

```typescript
const userAPI = new FetchClient({ baseUrl: "https://users.api.com" });
const paymentAPI = new FetchClient({ baseUrl: "https://payments.api.com" });

// Each client manages its own base URL
const user = await userAPI.get("/profile");           // → users.api.com
const invoice = await paymentAPI.get("/invoices/123"); // → payments.api.com
```

### Dynamic Base URL Updates

Need to change the base URL after creating a client? Use `setBaseUrl()`:

```typescript
import { FetchClient, useProductionStack } from "@fgrzl/fetch";

// Start with a client
const client = new FetchClient();

// Set base URL dynamically
client.setBaseUrl("https://api.example.com");
await client.get("/users"); // → GET https://api.example.com/users

// Update to a different environment
client.setBaseUrl("https://staging-api.example.com");
await client.get("/users"); // → GET https://staging-api.example.com/users

// Works great with middleware stacks
const prodClient = useProductionStack(new FetchClient(), {
  auth: { tokenProvider: () => getAuthToken() },
  retry: { maxRetries: 3 },
  logging: { level: 'info' }
}).setBaseUrl(process.env.API_BASE_URL!); // Method chaining!

// Now you can use it
await prodClient.get("/users");
```

### Environment-Based Setup

Perfect for different deployment environments:

```typescript
// Environment-aware setup
const client = useProductionStack(new FetchClient())
  .setBaseUrl(
    process.env.NODE_ENV === 'production' 
      ? 'https://api.mycompany.com'
      : 'http://localhost:3000/api'
  );
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

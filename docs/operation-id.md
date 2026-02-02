# Operation ID

The operation ID feature allows you to track and correlate requests across your application and services. When provided, it automatically sets the `x-operation-id` header on every request.

## Overview

Operation IDs are useful for:

- **Distributed tracing**: Track requests across multiple services
- **Logging and debugging**: Correlate logs for a specific operation
- **Request correlation**: Link related requests together
- **Audit trails**: Track user actions through your system

## Basic Usage

Pass an `operationId` in the request options:

```typescript
import api from "@fgrzl/fetch";

// Generate a unique operation ID
const operationId = crypto.randomUUID();

// The x-operation-id header is automatically added
await api.get("/api/users", {}, { operationId });
```

## With All HTTP Methods

Operation ID works with all HTTP methods:

```typescript
import { FetchClient } from "@fgrzl/fetch";

const client = new FetchClient();
const opId = crypto.randomUUID();

// GET request
await client.get("/api/users", {}, { operationId: opId });

// POST request
await client.post("/api/users", { name: "John" }, {}, { operationId: opId });

// PUT request
await client.put("/api/users/1", { name: "Jane" }, {}, { operationId: opId });

// PATCH request
await client.patch(
  "/api/users/1",
  { email: "new@example.com" },
  {},
  { operationId: opId },
);

// DELETE request
await client.del("/api/users/1", {}, { operationId: opId });
```

## Request Context Propagation

Use operation IDs to propagate context through your application:

```typescript
import { FetchClient } from "@fgrzl/fetch";

// In your API route handler
export async function handleRequest(req: Request) {
  // Extract operation ID from incoming request
  const operationId = req.headers.get("x-request-id") || crypto.randomUUID();

  const client = new FetchClient();

  // Propagate to downstream services
  const userData = await client.get("/api/users", {}, { operationId });

  const ordersData = await client.get("/api/orders", {}, { operationId });

  // All requests will have the same operation ID for correlation
  return Response.json({ users: userData, orders: ordersData });
}
```

## With Logging Middleware

Combine operation ID with logging middleware for enhanced observability:

```typescript
import { FetchClient, addLogging } from '@fgrzl/fetch';

const client = addLogging(new FetchClient(), {
  level: 'info',
  logger: console
});

const operationId = 'checkout-flow-123';

// Each logged request will include the operation ID in the x-operation-id header
await client.post('/api/cart', { items: [...] }, {}, { operationId });
await client.post('/api/payment', { amount: 100 }, {}, { operationId });
await client.post('/api/order', { cartId: '...' }, {}, { operationId });
```

## Advanced: Middleware for Automatic Operation IDs

Create middleware to automatically add operation IDs to all requests:

```typescript
import { FetchClient } from "@fgrzl/fetch";

const client = new FetchClient();

// Middleware that adds operation ID to every request
client.use((request, next) => {
  request.headers = {
    ...request.headers,
    "x-operation-id": crypto.randomUUID(),
  };
  return next(request);
});

// Now all requests automatically get an operation ID
await client.get("/api/users");
await client.post("/api/logs", { message: "test" });
```

## Custom Header Name

If your backend uses a different header name, you can use middleware:

```typescript
const client = new FetchClient();

client.use((request, next) => {
  // Use your custom header name
  request.headers = {
    ...request.headers,
    "x-trace-id": crypto.randomUUID(), // or 'x-correlation-id', etc.
  };
  return next(request);
});
```

## Combining with Other Options

Operation ID works seamlessly with other request options:

```typescript
import { FetchClient } from "@fgrzl/fetch";

const client = new FetchClient();
const controller = new AbortController();

await client.get(
  "/api/users",
  {},
  {
    operationId: "my-operation",
    signal: controller.signal, // Cancellation
    timeout: 5000, // Timeout
  },
);
```

## Type Safety

The `operationId` option is fully typed through the `RequestOptions` interface:

```typescript
import type { RequestOptions } from "@fgrzl/fetch";

// TypeScript knows about operationId
const options: RequestOptions = {
  operationId: "trace-123",
  signal: abortController.signal,
  timeout: 3000,
};

await client.get("/api/data", {}, options);
```

## Best Practices

1. **Use UUIDs**: Generate unique IDs using `crypto.randomUUID()` or a similar library
2. **Propagate context**: Pass operation IDs from incoming requests to outgoing requests
3. **Log consistently**: Include operation IDs in your application logs
4. **Backend support**: Ensure your backend services log and propagate the operation ID
5. **Per-operation IDs**: Use the same ID for all requests that are part of a single user operation

## Example: Complete Trace Flow

```typescript
import { FetchClient } from "@fgrzl/fetch";

async function processUserCheckout(userId: string) {
  const client = new FetchClient();
  const operationId = `checkout-${userId}-${Date.now()}`;

  console.log("Starting checkout:", operationId);

  try {
    // All requests share the same operation ID
    const cart = await client.get(`/api/cart/${userId}`, {}, { operationId });

    const payment = await client.post(
      "/api/payment",
      { cartId: cart.data?.id },
      {},
      { operationId },
    );

    const order = await client.post(
      "/api/order",
      { paymentId: payment.data?.id },
      {},
      { operationId },
    );

    console.log("Checkout completed:", operationId, order.data);
    return order;
  } catch (error) {
    console.error("Checkout failed:", operationId, error);
    throw error;
  }
}
```

Now you can trace the entire checkout flow across all services by searching for the operation ID!

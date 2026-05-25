# Operation ID

`operationId` adds an `x-operation-id` header to a single request so logs and traces can follow the same operation across services.

## Basic Usage

```ts
import { FetchClient } from '@fgrzl/fetch';

const api = new FetchClient();
const operationId = crypto.randomUUID();

await api.get('/api/users', {}, { operationId });
```

## Across Methods

Operation IDs work with every request method:

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();
const operationId = crypto.randomUUID();

await client.get('/api/users', {}, { operationId });
await client.post('/api/users', { name: 'John' }, {}, { operationId });
await client.put('/api/users/1', { name: 'Jane' }, {}, { operationId });
await client.patch(
  '/api/users/1',
  { email: 'new@example.com' },
  {},
  { operationId },
);
await client.del('/api/users/1', {}, { operationId });
```

## Correlate Requests

Use `operationId` to propagate request context through your application:

```ts
import { FetchClient } from '@fgrzl/fetch';

export async function handleRequest(req: Request) {
  const operationId = req.headers.get('x-request-id') || crypto.randomUUID();
  const client = new FetchClient();

  const users = await client.get('/api/users', {}, { operationId });
  const orders = await client.get('/api/orders', {}, { operationId });

  return Response.json({ users, orders });
}
```

## With Logging

```ts
import { FetchClient } from '@fgrzl/fetch';
import { addLogging } from '@fgrzl/fetch/middleware/logging';

const client = addLogging(new FetchClient(), {
  level: 'info',
  logger: console,
});

const operationId = 'checkout-flow-123';

await client.post('/api/cart', { items: ['sku-1'] }, {}, { operationId });
await client.post('/api/payment', { amount: 100 }, {}, { operationId });
await client.post('/api/order', { cartId: 'cart-1' }, {}, { operationId });
```

## Type Safety

`operationId` is fully typed through `RequestOptions`.

```ts
import { FetchClient } from '@fgrzl/fetch';
import type { RequestOptions } from '@fgrzl/fetch';

const client = new FetchClient();

const options: RequestOptions = {
  operationId: 'trace-123',
  timeout: 3000,
};

await client.get('/api/data', {}, options);
```

## Best Practices

- Use UUIDs for generated operation IDs.
- Propagate the same ID through related downstream requests.
- Include the ID in application logs.
- Make sure the backend logs and forwards the same header.
- Reuse the same ID for every request in one user operation.

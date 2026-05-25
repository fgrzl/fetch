# Cancellation and Timeouts

Requests support standard `AbortSignal` cancellation and configured timeouts.

## Manual Cancellation

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();
const controller = new AbortController();
const pending = client.get('/slow', {}, { signal: controller.signal });

controller.abort();

const response = await pending;

if (!response.ok && response.statusText === 'Request Aborted') {
  console.log('Request cancelled');
}
```

## Client Default Timeout

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient({ timeout: 5000 });

const response = await client.get('/users');
```

## Per-Request Timeout

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();

await client.get('/quick', {}, { timeout: 1000 });
await client.get('/slow-report', {}, { timeout: 30000 });
await client.get('/no-timeout', {}, { timeout: 0 });
```

## Signal Plus Timeout

```ts
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();
const controller = new AbortController();

const response = await client.get(
  '/data',
  {},
  {
    signal: controller.signal,
    timeout: 5000,
  },
);
```

Whichever cancellation happens first aborts the request. Both result in `ok: false`, `status: 0`, and `statusText: 'Request Aborted'`.

## React Cleanup Example

```tsx
import { useEffect, useState } from 'react';
import { FetchClient } from '@fgrzl/fetch';

const client = new FetchClient();

interface User {
  id: number;
  name: string;
}

function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    void client
      .get<User[]>('/users', {}, { signal: controller.signal })
      .then((response) => {
        if (response.ok) {
          setUsers(response.data);
        }
      });

    return () => controller.abort();
  }, []);

  return null;
}
```

# Cancellation And Timeouts

Requests support standard `AbortSignal` cancellation and configured timeouts.

## Manual Cancellation

```ts
const controller = new AbortController();

const pending = api.get('/slow', {}, { signal: controller.signal });

controller.abort();

const response = await pending;

if (!response.ok && response.statusText === 'Request Aborted') {
  console.log('Request cancelled');
}
```

## Default Timeout

```ts
const client = new FetchClient({
  timeout: 5000,
});

const response = await client.get('/users');
```

## Per-Request Timeout

```ts
await client.get('/quick', {}, { timeout: 1000 });
await client.get('/slow-report', {}, { timeout: 30000 });
await client.get('/no-timeout', {}, { timeout: 0 });
```

Timeouts return a failed response with `status: 0` and `statusText: 'Request Aborted'`.

## Signal Plus Timeout

```ts
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

Whichever cancellation happens first aborts the request.

## React Cleanup Example

```tsx
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
```

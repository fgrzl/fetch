# Request Cancellation and Timeouts

Learn how to cancel requests and set timeouts to handle slow or unresponsive endpoints.

## Table of Contents

- [Overview](#overview)
- [AbortController Support](#abortcontroller-support)
- [Timeout Configuration](#timeout-configuration)
- [Combining Signal and Timeout](#combining-signal-and-timeout)
- [Best Practices](#best-practices)

## Overview

`@fgrzl/fetch` provides first-class support for request cancellation using the standard `AbortController` API and configurable timeouts.

**Key Features:**

✅ Native AbortController integration  
✅ Global and per-request timeout configuration  
✅ Automatic cleanup and resource management  
✅ Graceful error handling for aborted requests

## AbortController Support

### Manual Cancellation

Cancel requests programmatically using `AbortController`:

```typescript
import { FetchClient } from "@fgrzl/fetch";

const client = new FetchClient();
const controller = new AbortController();

// Start a request
const request = client.get(
  "/api/slow-endpoint",
  {},
  { signal: controller.signal },
);

// Cancel it later
setTimeout(() => {
  controller.abort();
}, 2000);

// Handle the cancellation
const response = await request;
if (!response.ok && response.status === 0) {
  console.log("Request was cancelled");
}
```

### User-Initiated Cancellation

Perfect for cancel buttons in UI:

```typescript
const controller = new AbortController();

// Start download
const downloadBtn = document.querySelector("#download");
const cancelBtn = document.querySelector("#cancel");

download Btn.addEventListener("click", async () => {
  const response = await client.get("/api/large-file", {}, { signal: controller.signal });

  if (response.ok) {
    console.log("Download complete");
  }
});

cancelBtn.addEventListener("click", () => {
  controller.abort();
  console.log("Download cancelled");
});
```

### All HTTP Methods Support Cancellation

```typescript
// GET
await client.get("/api/users", {}, { signal: controller.signal });

// POST
await client.post(
  "/api/users",
  { name: "John" },
  {},
  { signal: controller.signal },
);

// PUT
await client.put(
  "/api/users/1",
  { name: "Jane" },
  {},
  { signal: controller.signal },
);

// PATCH
await client.patch(
  "/api/users/1",
  { email: "new@example.com" },
  {},
  { signal: controller.signal },
);

// DELETE
await client.del("/api/users/1", {}, { signal: controller.signal });

// HEAD
await client.head("/api/resource", {}, { signal: controller.signal });
```

## Timeout Configuration

### Global Timeout

Set a default timeout for all requests:

```typescript
const client = new FetchClient({
  baseUrl: "https://api.example.com",
  timeout: 5000, // 5 seconds
});

// All requests will timeout after 5 seconds
const response = await client.get("/api/users");
```

### Per-Request Timeout

Override the global timeout for specific requests:

```typescript
const client = new FetchClient({ timeout: 10000 }); // 10 second default

// Fast endpoint - use shorter timeout
const quick = await client.get("/api/quick", {}, { timeout: 1000 });

// Slow endpoint - use longer timeout
const slow = await client.get("/api/slow-report", {}, { timeout: 30000 });

// No timeout for this specific request
const noTimeout = await client.get("/api/streaming", {}, { timeout: 0 });
```

### Handling Timeouts

Timeouts are treated like aborted requests:

```typescript
const response = await client.get("/api/slow", {}, { timeout: 2000 });

if (!response.ok) {
  if (response.status === 0 && response.statusText === "Request Aborted") {
    console.error("Request timed out");
    // Retry logic, show error message, etc.
  }
}
```

## Combining Signal and Timeout

You can use both AbortController and timeout together:

```typescript
const controller = new AbortController();

const response = await client.get(
  "/api/data",
  {},
  {
    signal: controller.signal, // Manual cancellation
    timeout: 5000, // Automatic timeout
  },
);

// Whichever happens first will cancel the request
```

## Best Practices

### 1. Always Handle Aborted Requests

```typescript
const controller = new AbortController();

try {
  const response = await client.get(
    "/api/data",
    {},
    { signal: controller.signal },
  );

  if (!response.ok) {
    if (response.status === 0) {
      console.log("Request was cancelled or timed out");
      return;
    }
    console.error("Request failed:", response.error?.message);
  }
} catch (error) {
  console.error("Unexpected error:", error);
}
```

### 2. Set Reasonable Timeouts

```typescript
const client = new FetchClient({
  timeout: 10000, // 10 seconds for most requests
});

// Shorter timeout for health checks
await client.get("/health", {}, { timeout: 2000 });

// Longer timeout for file uploads
await client.post("/api/upload", largeFile, {}, { timeout: 60000 });
```

### 3. Clean Up Controllers

```typescript
class DataService {
  private controller: AbortController | null = null;

  async fetchData() {
    // Cancel previous request if still running
    this.controller?.abort();

    this.controller = new AbortController();

    const response = await client.get(
      "/api/data",
      {},
      { signal: this.controller.signal },
    );

    return response;
  }

  cleanup() {
    this.controller?.abort();
    this.controller = null;
  }
}
```

### 4. Provide User Feedback

```typescript
const controller = new AbortController();
let timeoutId: NodeJS.Timeout;

// Show loading indicator
showLoading();

// Set up timeout with warning
timeoutId = setTimeout(() => {
  showWarning("Request is taking longer than expected...");
}, 5000);

try {
  const response = await client.get(
    "/api/data",
    {},
    {
      signal: controller.signal,
      timeout: 30000,
    },
  );

  if (response.ok) {
    showSuccess("Data loaded");
  }
} finally {
  clearTimeout(timeoutId);
  hideLoading();
}
```

### 5. Retry with Timeout

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await client.get(url, {}, { timeout: 5000 });

    if (response.ok) {
      return response;
    }

    if (response.status === 0) {
      console.log(`Attempt ${i + 1} timed out, retrying...`);
      continue;
    }

    // Non-timeout error, don't retry
    return response;
  }

  throw new Error("Max retries exceeded");
}
```

## React Example

```typescript
import { useState, useEffect } from "react";
import { FetchClient } from "@fgrzl/fetch";

function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const client = new FetchClient();

    async function fetchData() {
      setLoading(true);

      const response = await client.get(
        "/api/data",
        {},
        {
          signal: controller.signal,
          timeout: 10000,
        },
      );

      if (response.ok) {
        setData(response.data);
      }

      setLoading(false);
    }

    fetchData();

    // Cleanup: cancel request if component unmounts
    return () => {
      controller.abort();
    };
  }, []);

  return <div>{loading ? "Loading..." : JSON.stringify(data)}</div>;
}
```

## See Also

- [Configuration](./configuration.md) - Learn about FetchClient configuration options
- [Error Handling](./error-handling.md) - Handle errors gracefully
- [Middleware](./middleware.md) - Add retry logic and other enhancements

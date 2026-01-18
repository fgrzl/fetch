# CSRF Protection Middleware

Automatically includes CSRF tokens in requests for secure APIs.

## Usage

```ts
import { addCSRF, createCSRFMiddleware } from "@fgrzl/fetch";

// Simple usage
addCSRF(client, {
  cookieName: "XSRF-TOKEN", // Industry standard
  headerName: "X-XSRF-TOKEN", // HTTP header convention
});

// Advanced usage with factory
const CSRFMiddleware = createCSRFMiddleware({
  cookieName: "XSRF-TOKEN",
  headerName: "X-XSRF-TOKEN",
});
client.use(CSRFMiddleware);
```

## Options

- `cookieName`: Name of the CSRF token cookie (default: `XSRF-TOKEN`)
- `headerName`: Name of the HTTP header to send the token (default: `X-XSRF-TOKEN`)

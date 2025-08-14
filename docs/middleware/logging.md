# Logging Middleware

Provides comprehensive request and response logging for debugging, monitoring, and observability.

## Usage

### Simple Logging

```ts
import { useLogging } from "@fgrzl/fetch";

// Default logging (info level)
const loggedClient = useLogging(client);

// Custom log level
const debugClient = useLogging(client, {
  level: "debug",
});
```

### Advanced Configuration

```ts
import { useLogging, createLoggingMiddleware } from "@fgrzl/fetch";

// Comprehensive logging configuration
const loggedClient = useLogging(client, {
  level: "debug",
  includeRequestHeaders: true,
  includeResponseHeaders: true,
  includeRequestBody: true,
  includeResponseBody: true,
  logger: console, // Custom logger
  filter: (request) => !request.url?.includes("/health"),
});

// Factory approach
const loggingMiddleware = createLoggingMiddleware({
  level: "info",
  logger: customLogger,
});
client.use(loggingMiddleware);
```

### Custom Logger

```ts
import { useLogging } from "@fgrzl/fetch";

// Custom logger implementation
const customLogger = {
  debug: (message: string, meta?: any) =>
    console.debug(`[DEBUG] ${message}`, meta),
  info: (message: string, meta?: any) =>
    console.info(`[INFO] ${message}`, meta),
  warn: (message: string, meta?: any) =>
    console.warn(`[WARN] ${message}`, meta),
  error: (message: string, meta?: any) =>
    console.error(`[ERROR] ${message}`, meta),
};

const loggedClient = useLogging(client, {
  logger: customLogger,
  level: "debug",
});
```

## Configuration Options

```ts
interface LoggingOptions {
  level?: LogLevel; // Log level (default: 'info')
  logger?: Logger; // Custom logger (default: console)
  includeRequestHeaders?: boolean; // Log request headers (default: false)
  includeResponseHeaders?: boolean; // Log response headers (default: false)
  includeRequestBody?: boolean; // Log request body (default: false)
  includeResponseBody?: boolean; // Log response body (default: false)
  filter?: (request: RequestInit & { url: string }) => boolean; // Request filter
  sanitize?: (data: any) => any; // Data sanitization function
}

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}
```

## Log Output Examples

### Basic Request/Response

```
→ GET /api/users → 200 (152ms)
← GET /api/users → 200 (152ms) {
  level: 'info',
  timestamp: 1234567890123,
  method: 'GET',
  url: '/api/users',
  status: 200,
  duration: 152
}
```

### Debug Level with Headers

```
→ POST /api/users {
  level: 'debug',
  timestamp: 1234567890123,
  method: 'POST',
  url: '/api/users',
  requestHeaders: {
    'content-type': 'application/json',
    'authorization': '[REDACTED]'
  },
  requestBody: {
    name: 'John Doe',
    email: 'john@example.com'
  }
}

← POST /api/users → 201 (95ms) {
  level: 'info',
  timestamp: 1234567890218,
  method: 'POST',
  url: '/api/users',
  status: 201,
  duration: 95,
  responseHeaders: {
    'content-type': 'application/json',
    'location': '/api/users/456'
  },
  responseBody: {
    id: 456,
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: '2023-01-01T12:00:00Z'
  }
}
```

## Examples

### Production Logging

```ts
// Production-safe logging configuration
const productionClient = useLogging(client, {
  level: "info",
  includeRequestHeaders: false,
  includeResponseHeaders: false,
  includeRequestBody: false,
  includeResponseBody: false,
  sanitize: (data) => {
    // Remove sensitive data
    const sanitized = { ...data };
    if (sanitized.requestHeaders?.authorization) {
      sanitized.requestHeaders.authorization = "[REDACTED]";
    }
    return sanitized;
  },
});
```

### Development Logging

```ts
// Full visibility for development
const devClient = useLogging(client, {
  level: "debug",
  includeRequestHeaders: true,
  includeResponseHeaders: true,
  includeRequestBody: true,
  includeResponseBody: true,
});
```

### Selective Logging

```ts
// Only log API requests, skip health checks
const selectiveClient = useLogging(client, {
  filter: (request) =>
    request.url?.startsWith("/api/") && !request.url.includes("/health"),
  level: "info",
});
```

### Structured Logging with Winston

```ts
import winston from "winston";

const winstonLogger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "api-requests.log" })],
});

const structuredClient = useLogging(client, {
  logger: {
    debug: (msg, meta) => winstonLogger.debug(msg, meta),
    info: (msg, meta) => winstonLogger.info(msg, meta),
    warn: (msg, meta) => winstonLogger.warn(msg, meta),
    error: (msg, meta) => winstonLogger.error(msg, meta),
  },
  includeRequestBody: true,
  includeResponseBody: true,
});
```

## Integration Examples

### Next.js API Monitoring

```ts
// Monitor API route performance
const monitoredClient = useLogging(new FetchClient(), {
  logger: {
    info: (message, meta) => {
      console.log(message);
      // Send metrics to monitoring service
      if (meta?.duration > 1000) {
        analytics.track("slow_api_request", {
          url: meta.url,
          duration: meta.duration,
        });
      }
    },
  },
});
```

### Error Tracking Integration

```ts
import * as Sentry from "@sentry/node";

const errorTrackingClient = useLogging(client, {
  logger: {
    error: (message, meta) => {
      console.error(message, meta);
      if (meta?.status >= 400) {
        Sentry.addBreadcrumb({
          category: "http",
          message: `${meta.method} ${meta.url} → ${meta.status}`,
          level: "error",
          data: meta,
        });
      }
    },
  },
});
```

## Security Considerations

### Data Sanitization

```ts
const secureClient = useLogging(client, {
  sanitize: (data) => {
    const sanitized = { ...data };

    // Redact sensitive headers
    if (sanitized.requestHeaders) {
      ["authorization", "cookie", "x-api-key"].forEach((header) => {
        if (sanitized.requestHeaders[header]) {
          sanitized.requestHeaders[header] = "[REDACTED]";
        }
      });
    }

    // Redact sensitive body fields
    if (sanitized.requestBody && typeof sanitized.requestBody === "object") {
      ["password", "token", "secret"].forEach((field) => {
        if (sanitized.requestBody[field]) {
          sanitized.requestBody[field] = "[REDACTED]";
        }
      });
    }

    return sanitized;
  },
});
```

## Best Practices

1. **Production safety**: Never log sensitive data in production
2. **Performance impact**: Logging adds overhead, especially body logging
3. **Log levels**: Use appropriate levels (debug for dev, info for prod)
4. **Sanitization**: Always sanitize sensitive data before logging
5. **Filtering**: Skip health checks and other noisy endpoints
6. **Structured logging**: Use structured loggers for better observability
7. **Log rotation**: Configure log rotation to prevent disk space issues

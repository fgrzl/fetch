# @fgrzl/fetch documentation

TypeScript-first HTTP client built on the browser **`fetch`** API with composable middleware.

## Start here

| Document                              | Description                       |
| ------------------------------------- | --------------------------------- |
| [Getting started](getting-started.md) | Install, base URL, first requests |
| [Architecture](architecture.md)       | Client shape, middleware pipeline |
| [Configuration](configuration.md)     | Client options and defaults       |

## Guides

| Document                                | Description                          |
| --------------------------------------- | ------------------------------------ |
| [Middleware](middleware.md)             | Overview of built-in middleware      |
| [Error handling](error-handling.md)     | `ok`, `data`, `error` response model |
| [Cancellation](cancellation.md)         | AbortSignal and timeouts             |
| [TypeScript](typescript.md)             | Typing patterns                      |
| [Operation ID](operation-id.md)         | Correlation helpers                  |
| [Export structure](export-structure.md) | Package exports                      |
| [Troubleshooting](troubleshooting.md)   | Common issues                        |

## Middleware reference

| Document                                       | Description            |
| ---------------------------------------------- | ---------------------- |
| [Authentication](middleware/authentication.md) | Bearer tokens          |
| [Authorization](middleware/authorization.md)   | Failure handlers       |
| [Retry](middleware/retry.md)                   | Retries and backoff    |
| [Cache](middleware/cache.md)                   | Response caching       |
| [Logging](middleware/logging.md)               | Request/response logs  |
| [Rate limit](middleware/rate-limit.md)         | Client-side throttling |
| [CSRF](middleware/csrf.md)                     | CSRF tokens            |
| [Custom](middleware/custom.md)                 | Write your own         |

## Related

- [README](../README.md) — project entry point
- [CHANGELOG](../CHANGELOG.md) — release notes
- [CONTRIBUTING](../CONTRIBUTING.md) — contribution workflow
- [@fgrzl/fetch-gen](https://github.com/fgrzl/fetch-gen) — OpenAPI codegen

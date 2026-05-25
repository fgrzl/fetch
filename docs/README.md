# @fgrzl/fetch documentation

This documentation is organized around the normal request flow: start with the quick start, then read the response contract, then add configuration and middleware as needed.

## Start here

| Document                              | Description                              |
| ------------------------------------- | ---------------------------------------- |
| [Getting started](getting-started.md) | Install, base URL, and the first request |
| [Error handling](error-handling.md)   | Success and failure response branches    |
| [Architecture](architecture.md)       | Public contract and middleware flow      |
| [Configuration](configuration.md)     | Client options, defaults, and overrides  |

## Guides

| Document                                | Description                              |
| --------------------------------------- | ---------------------------------------- |
| [Middleware](middleware.md)             | Built-in middleware and composition      |
| [Cancellation](cancellation.md)         | AbortSignal and timeout behavior         |
| [TypeScript](typescript.md)             | Narrowing, generics, and response types  |
| [Operation ID](operation-id.md)         | Correlation headers and tracing helpers  |
| [Export structure](export-structure.md) | Package entry points and subpath exports |
| [Troubleshooting](troubleshooting.md)   | Common setup and runtime issues          |

## Middleware reference

| Document                                       | Description                    |
| ---------------------------------------------- | ------------------------------ |
| [Authentication](middleware/authentication.md) | Bearer token injection         |
| [Authorization](middleware/authorization.md)   | Selected failure handling      |
| [Retry](middleware/retry.md)                   | Retries with backoff           |
| [Cache](middleware/cache.md)                   | TTL memoization for safe reads |
| [Logging](middleware/logging.md)               | Request and response logging   |
| [Rate limit](middleware/rate-limit.md)         | Client-side throttling         |
| [CSRF](middleware/csrf.md)                     | CSRF token injection           |
| [Custom](middleware/custom.md)                 | Write middleware directly      |

## Related

- [README](../README.md) - project entry point
- [CHANGELOG](../CHANGELOG.md) - release notes
- [CONTRIBUTING](../CONTRIBUTING.md) - contribution workflow
- [@fgrzl/fetch-gen](https://github.com/fgrzl/fetch-gen) - OpenAPI code generation

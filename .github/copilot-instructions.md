# copilot-instructions.md

## Project Overview

This repository contains a configurable HTTP client for TypeScript/JavaScript, supporting middleware for request and response processing. It includes error handling, typed requests, and is tested with Vitest.

## Coding Guidelines

- Use TypeScript for all source code.
- Follow existing code style and conventions.
- Prefer async/await for asynchronous operations.
- Add JSDoc comments for public methods and exported types.
- Write unit tests for new features and bug fixes using Vitest.

## Middleware

- Request and response middleware should be composable and non-blocking.
- Middleware functions must return Promises.

## Error Handling

- Use custom error classes (`HttpError`, `NetworkError`) for HTTP and network errors.
- Always propagate errors with meaningful messages.

## Versioning

- Use semantic versioning.
- Tag releases with `v<major>.<minor>.<patch>` (e.g., `v1.0.0`).

## CI/CD

- All code must pass CI checks defined in `.github/workflows/ci.yml`.
- Ensure tests and linting pass before merging changes.

## Pull Requests

- Include a clear description of changes.
- Reference related issues if applicable.
- Ensure all tests pass before requesting review.

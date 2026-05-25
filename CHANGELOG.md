# Changelog

## [2.0.0]

### Changed

- Defined requests around a discriminated `FetchResponse<T, E>` result with structured failure details.
- Kept throwing behavior opt-in through `throwOnError`, `HttpError`, and `NetworkError`.
- Reduced the root API to the named client and core helpers; optional middleware now comes from middleware subpaths.
- Removed the shared default client, preset middleware stacks, minified subpath entry, automatic authorization redirects, and unimplemented rate-limit algorithm choices.
- Corrected retry composition so downstream middleware runs for every attempt.
- Moved builds, checks, tests, and benchmarks onto Vite+.

## [1.1.0-alpha.12] - 2025-08-14

### Added

- New features and enhancements

### Changed

- Updated dependencies and improvements

### Fixed

- Bug fixes and patches

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release of @fgrzl/fetch
- TypeScript-first HTTP client with middleware support
- Built-in CSRF protection middleware
- Authorization response-handler middleware
- Authentication middleware with bearer token support
- Retry middleware with configurable strategies
- Response caching middleware
- Rate limiting middleware
- Comprehensive logging middleware
- Pre-built middleware stacks for common use cases
- Excellent TypeScript support with full type safety
- Zero dependencies
- Modern build system with Vite
- Comprehensive test suite (99.43% coverage)
- Detailed documentation with examples

### Changed

### Deprecated

### Removed

### Fixed

### Security

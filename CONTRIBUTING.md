# Contributing to @fgrzl/fetch

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Code editor (VS Code recommended)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/fgrzl/fetch.git
cd fetch

# Install dependencies
npm install

# Run tests to ensure everything works
npm test
```

## 📋 Development Workflow

### 1. Branch Strategy

We follow GitFlow:

- `main` - Production releases
- `develop` - Active development
- `feature/*` - New features
- `fix/*` - Bug fixes
- `hotfix/*` - Critical fixes

### 2. Making Changes

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Make your changes...

# Run the development commands
npm run dev          # Watch mode for development
npm run test:watch   # Watch tests
npm run lint         # Check code style
```

### 3. Quality Checks

Before submitting, ensure your code passes:

```bash
npm run test:coverage  # All tests with coverage
npm run lint:check     # ESLint checks
npm run format:check   # Prettier formatting
npm run build          # TypeScript compilation
```

### 4. Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add CSRF middleware
fix: handle network timeout correctly
docs: update middleware examples
test: add edge case for retry logic
chore: update dependencies
```

## 🧪 Testing

### Test Structure

```
test/
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── edge-cases.test.ts   # Edge cases and error scenarios
└── test-utils.ts        # Testing utilities
```

### Writing Tests

```typescript
import { describe, it, expect } from "vitest";
import { FetchClient } from "../src";

describe("Feature Name", () => {
  it("should handle expected case", async () => {
    // Arrange
    const client = new FetchClient();

    // Act
    const result = await client.get("/test");

    // Assert
    expect(result.ok).toBe(true);
  });

  it("should handle error case", async () => {
    // Test error scenarios
  });
});
```

### Test Coverage Requirements

- Maintain **>95%** line coverage
- Test both success and error paths
- Include edge cases and error scenarios

## 🛠 Code Standards

### TypeScript Guidelines

- Use strict TypeScript settings
- Prefer `interface` over `type` for object shapes
- Export types alongside implementations
- Add JSDoc comments for public APIs

### Code Style

- Use Prettier for formatting (configured in `.prettierrc`)
- Follow ESLint rules (configured in `eslint.config.ts`)
- Use meaningful variable names
- Keep functions focused and testable

### Example Code Style

```typescript
/**
 * Creates a new HTTP client with smart defaults.
 *
 * @param config - Optional configuration
 * @returns Configured FetchClient instance
 */
export function createClient(config?: ClientConfig): FetchClient {
  const client = new FetchClient(config);

  // Apply smart defaults
  useCSRF(client);
  useRetry(client);

  return client;
}
```

## 📦 Adding New Features

### 1. Middleware Development

New middleware should:

- Follow the existing patterns in `src/middleware/`
- Include comprehensive tests
- Have TypeScript types exported
- Include documentation

Example structure:

```
src/middleware/my-feature/
├── index.ts           # Public exports
├── my-feature.ts      # Implementation
└── types.ts           # TypeScript types

test/middleware/
└── my-feature.test.ts # Tests

docs/middleware/
└── my-feature.md      # Documentation
```

### 2. Client Features

When modifying `FetchClient`:

- Maintain backward compatibility
- Add appropriate TypeScript types
- Test integration with existing middleware
- Update documentation

## 📚 Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Cover common use cases
- Document error scenarios

### Documentation Structure

```
docs/
├── *.md              # Main guides
└── middleware/       # Middleware-specific docs
    └── *.md
```

## 🚀 Pull Request Process

### 1. Before Submitting

- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint:check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated (for significant changes)

### 2. PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Added/updated tests
- [ ] All tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
```

### 3. Review Process

1. Automated checks must pass
2. Maintainer review required
3. Address feedback
4. Final approval and merge

## 🐛 Reporting Issues

### Bug Reports

Include:

- Library version
- Node.js version
- Minimal reproduction code
- Expected vs actual behavior
- Error messages/stack traces

### Feature Requests

Include:

- Use case description
- Proposed API (if applicable)
- Alternative solutions considered
- Willing to implement? (We love contributors!)

## 🤝 Code of Conduct

### Be Respectful

- Use inclusive language
- Be constructive in feedback
- Help create a welcoming environment

### Be Collaborative

- Ask questions when unsure
- Share knowledge
- Help others learn

## 💡 Getting Help

- **Questions**: Open a discussion
- **Bugs**: Create an issue
- **Features**: Start with a discussion
- **Chat**: Reach out to maintainers

## 📊 Development Scripts

```bash
# Development
npm run dev              # Watch mode
npm run test:watch       # Watch tests

# Quality
npm run test             # Run all tests
npm run test:coverage    # Tests with coverage
npm run lint             # Fix linting issues
npm run lint:check       # Check linting only
npm run format           # Fix formatting
npm run format:check     # Check formatting only

# Building
npm run build            # Production build
npm run clean            # Clean build artifacts

# Documentation
npm run docs:serve       # Serve docs locally
```

## 🏆 Recognition

Contributors are recognized in:

- Repository contributors list
- Release notes for significant contributions
- Special thanks for major features

Thank you for making @fgrzl/fetch better! 🎉

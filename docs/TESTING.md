# Testing Guide

Clear, organized testing infrastructure with predictable test locations and execution.

## Test Organization

### Where Tests Go

Tests are organized by type and location:

```
packages/*/src/**/*.test.ts          → pkg-unit (unit tests)
packages/*/src/**/*.spec.test.ts     → pkg-int (integration tests)
apps/web/src/**/*.test.{ts,tsx}      → app-unit
apps/web/src/**/*.spec.test.{ts,tsx} → app-int
tests/integration/**                 → xrepo (cross-repo integration)
tests/e2e-essential/**               → e2e (end-to-end golden tests)
```

### Test Types

**Unit Tests (*.test.ts)**
- Fast, isolated tests
- Test single functions/modules
- No external dependencies
- Use dependency injection with fakes

**Integration Tests (*.spec.test.ts)**
- Test multiple components together
- May use real HTTP with MSW
- Longer timeouts (30s-120s)
- Test realistic scenarios

**Cross-Repo Integration (tests/integration/)**
- Test API endpoints
- Test package interactions
- Real HTTP requests with MSW
- 45s timeout

**E2E Tests (tests/e2e-essential/)**
- Full workflow execution
- Golden trace validation
- Single-threaded for determinism
- 60s timeout

## Running Tests

### By Project

Run specific test projects by name:

```bash
# Package unit tests
bunx vitest --project pkg-unit

# Package integration tests
bunx vitest --project pkg-int

# App unit tests
bunx vitest --project app-unit

# App integration tests
bunx vitest --project app-int

# Cross-repo integration
bunx vitest --project xrepo

# E2E golden tests
bunx vitest --project e2e
```

### Legacy Commands

Existing commands still work:

```bash
# Smoke tests (fast)
bun test:smoke

# Gate tests (comprehensive)
bun test:gate
```

### Watch Mode

Run tests in watch mode during development:

```bash
bunx vitest --project pkg-unit --watch
bunx vitest --project pkg-int --watch
```

### Coverage

```bash
bunx vitest --coverage --project pkg-unit
bunx vitest --coverage --project xrepo
```

## MSW Test Mocking

Use Mock Service Worker (MSW) for HTTP mocking in integration tests.

### Basic Setup

```typescript
import { createTestServer } from "@tests/msw/server"
import { openaiHandlers } from "@tests/msw/handlers"

const server = createTestServer(...openaiHandlers())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
```

### Available Handlers

- `openaiHandlers()` - OpenAI API mocks
- `anthropicHandlers()` - Anthropic API mocks
- `githubHandlers()` - GitHub API mocks

### Handler Options

```typescript
// Simulate failures
openaiHandlers({ fail: true })
openaiHandlers({ rateLimited: true })

// Add latency
openaiHandlers({ delay: 1000 })

// Combine services
const server = createTestServer(
  ...openaiHandlers(),
  ...anthropicHandlers({ fail: true })
)
```

## Writing Tests

### Unit Test Example

```typescript
// packages/core/src/utils/math.test.ts
import { describe, expect, it } from "vitest"
import { add } from "./math"

describe("add", () => {
  it("adds two numbers", () => {
    expect(add(1, 2)).toBe(3)
  })
})
```

### Integration Test Example

```typescript
// packages/core/src/workflow/__tests__/execute.spec.test.ts
import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest"
import { createTestServer } from "@tests/msw/server"
import { openaiHandlers } from "@tests/msw/handlers"
import { executeWorkflow } from "../execute"

const server = createTestServer(...openaiHandlers())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

describe("executeWorkflow", () => {
  it("executes a simple workflow", async () => {
    const result = await executeWorkflow({
      /* ... */
    })
    expect(result.status).toBe("completed")
  })
})
```

## Configuration

### Root Configuration

All test configuration is in `vitest.config.ts` at the repository root using multi-project setup.

### Shared Test Configuration

The `@repo/test-config` package provides shared Vitest configuration:

- **vitest.base.ts** - Base configuration function with common settings
- **plugins.ts** - Shared Vite plugins (tsconfig paths resolution)
- **setup.global.ts** - Global test setup (timezone, CI settings)

### Per-Package Configuration

Each package can have a thin `vitest.config.ts` for running tests inside the package directory:

```typescript
import { baseConfig } from "@repo/test-config/vitest.base"

export default baseConfig({
  test: {
    include: ["packages/core/src/**/*.test.{ts,tsx}"],
  },
})
```

### Path Aliases

All tests have access to path aliases from `tsconfig.paths.json`:

- `@lucky/shared`, `@lucky/core`, `@lucky/tools`, `@lucky/models`
- `@tests/*` for test utilities
- `@/*` for Next.js app code
- `@core/*` for core package shortcuts
- `@examples/*` for example definitions

## Best Practices

1. **Use the right test type**
   - Unit tests for pure logic
   - Integration tests for workflows with dependencies
   - E2E tests only for critical paths

2. **Keep tests fast**
   - Mock external APIs with MSW
   - Use dependency injection for testability
   - Avoid setTimeout in tests

3. **Make tests deterministic**
   - No flaky timeouts
   - Reset mocks between tests
   - Use fixed timestamps (via global setup)

4. **Test behavior, not implementation**
   - Test public APIs
   - Avoid testing internal details
   - Focus on user-facing functionality

5. **Name tests clearly**
   - Use descriptive test names
   - Group related tests with describe()
   - Make failures easy to understand

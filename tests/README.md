# Tests

This directory contains integration and end-to-end tests for the project.

## Directory Structure

```
tests/
├── integration/        # Integration tests (API routes, external services)
│   └── api/           # API route integration tests
├── e2e-essential/     # End-to-end workflow tests
│   ├── smoke/         # Fast smoke tests (run on commit)
│   ├── gate/          # Full gate tests (run on push)
│   ├── setup/         # Test setup and configuration
│   └── utils/         # E2E test utilities
├── workflows/         # Test workflow configurations
└── helpers/           # Shared test utilities and helpers

```

## Quick Start

### Run All Tests
```bash
bun run test
```

### Run by Type
```bash
bun run test:smoke        # Fast smoke tests
bun run test:gate         # Comprehensive gate tests
bun run test:integration  # Integration tests only
```

### Run Specific Test
```bash
bunx vitest run tests/integration/api/v1/invoke.spec.test.ts
```

## Test Types

### Integration Tests (`integration/`)
Test how multiple modules work together with external dependencies:
- **API routes** - Full HTTP request/response cycle with auth and database
- **SDK integrations** - Verify external SDK configurations
- **Database operations** - Test persistence layer with real connections

**Example:**
```typescript
// tests/integration/api/v1/invoke.test.ts
describe("POST /api/v1/invoke", () => {
  it("should invoke workflow with authentication", async () => {
    const response = await fetch("/api/v1/invoke", {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    expect(response.status).toBe(200)
  })
})
```

### E2E Tests (`e2e-essential/`)
Test complete workflows and system behavior:
- **Smoke tests** - Critical path validation, run on every commit
- **Gate tests** - Comprehensive validation before deployment
- **Golden traces** - Regression testing with stored execution traces

**Example:**
```typescript
// tests/e2e-essential/smoke/trace-hash.test.ts
describe("golden trace hashing", () => {
  it("produces stable hash", () => {
    // Validates workflow execution consistency
  })
})
```

## Writing Tests

### Integration Test Template
```typescript
import { describe, expect, it, beforeAll, afterAll } from "vitest"

describe("Feature Name", () => {
  beforeAll(async () => {
    // Setup: create test data
  })

  afterAll(async () => {
    // Cleanup: remove test data
  })

  it("should do something", async () => {
    // Test implementation
  })
})
```

### Using Test Helpers
```typescript
import { createTestUser } from "@/helpers/test-auth"

const user = await createTestUser()
// Use user in tests
await user.cleanup() // Clean up when done
```

## Important Notes

### Where NOT to Put Tests
❌ **Never put integration tests in:**
- `apps/web/src/app/api/` - Production code only
- `packages/{package}/src/` - Only unit tests co-located with source

✅ **Always put integration tests in:**
- `tests/integration/` - All integration tests
- `tests/e2e-essential/` - All E2E tests

### Test Data Management
- Always clean up test data in `afterAll` or `afterEach`
- Use unique identifiers (e.g., `nanoid()`) for test data
- Never use production databases for testing
- Set `USE_MOCK_PERSISTENCE=true` to run without Supabase

### Environment Variables
For integration tests that require API keys or external services:
```bash
export TEST_API_KEY=alive_your_test_key
export TEST_API_URL=http://localhost:3000
```

## Configuration

### Vitest Config
Integration tests use the root-level configuration:
- `vitest.integration.config.ts` - Integration test config

### TypeScript Config
- `tests/integration/tsconfig.json` - TypeScript config for integration tests
- `tests/e2e-essential/types/env.d.ts` - Type definitions for test environment

## CI/CD

### Pre-commit
- Smoke tests run automatically before each commit

### Pre-push
- Gate tests run automatically before each push

### Pull Requests
All PRs must:
- Pass smoke tests
- Pass gate tests
- Pass type checking (`bun run tsc`)

## Full Documentation

For comprehensive testing guidelines, see [docs/TESTING.md](../docs/TESTING.md)

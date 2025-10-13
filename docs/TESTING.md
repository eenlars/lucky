# Testing Guide

## Test Organization

This project follows industry best practices for test organization, separating tests by type and purpose.

### Directory Structure

```
tests/
  ├── integration/        # Integration tests (API routes, external services)
  │   ├── api/           # API route integration tests
  │   └── sdk-integration.test.ts
  ├── e2e-essential/     # End-to-end workflow tests
  │   ├── smoke/         # Fast smoke tests (run on commit)
  │   └── gate/          # Full gate tests (run on push)
  ├── workflows/         # Test workflow configurations
  └── helpers/           # Shared test utilities and helpers

packages/
  └── {package}/
      └── src/
          └── __tests__/  # Unit tests co-located with source code

apps/
  └── web/
      └── src/
          └── __tests__/  # Component/feature unit tests
```

### Test Types and Placement

#### 1. Unit Tests
**Location:** Co-located with source code in `__tests__/` directories

**Purpose:** Test individual functions, components, or modules in isolation

**Examples:**
- `packages/core/src/workflow/__tests__/validation.test.ts`
- `apps/web/src/components/Button/__tests__/Button.test.ts`

**When to use:**
- Testing pure functions
- Component rendering and behavior
- Business logic in isolation
- Fast feedback during development

#### 2. Integration Tests
**Location:** `tests/integration/`

**Purpose:** Test how multiple modules work together, including external dependencies

**Examples:**
- `tests/integration/api/v1/invoke.spec.test.ts` - **NEW STANDARD: Real HTTP API testing**
- `tests/integration/sdk-integration.test.ts` - SDK integration validation

**NEW STANDARD for API Testing (Introduced 2025):**
We now test API routes through real HTTP calls, not just function imports. This ensures we test:
- The complete request/response cycle
- All middleware (authentication, rate limiting, CORS)
- Actual routing behavior
- Real error responses and status codes
- Headers and content-type handling

**When to use:**
- Testing API routes end-to-end (HTTP request → response)
- Database interactions
- External service integrations
- Authentication flows
- Multi-module workflows

**Why separate directory:**
- API route tests are integration tests, not unit tests
- Keeps production code directories clean
- Easier to run different test suites independently
- Prevents test code from being included in production bundles
- Centralizes test utilities and fixtures

**Why HTTP-level testing is superior:**
- Tests the actual API contract, not internal implementation
- Catches middleware and routing issues
- Validates real authentication flows
- Ensures API documentation matches reality
- More resilient to refactoring

#### 3. End-to-End Tests
**Location:** `tests/e2e-essential/`

**Purpose:** Test complete user workflows and system behavior

**Subdivided into:**
- `smoke/` - Fast critical path tests (run on every commit)
- `gate/` - Comprehensive tests (run before push/deploy)

**Examples:**
- `tests/e2e-essential/gate/workflow-basics.test.ts`
- `tests/e2e-essential/smoke/trace-hash.test.ts`

**When to use:**
- Testing full workflow execution
- Validating system-wide behavior
- Regression testing with golden traces
- Pre-deployment validation

### Test Utilities and Helpers

**Location:** `tests/helpers/`

**Purpose:** Shared test utilities, fixtures, and helper functions used across multiple test files

**Examples:**
- `tests/helpers/test-auth.ts` - Authentication test utilities
- `tests/helpers/fixtures.ts` - Test data fixtures
- `tests/helpers/mock-clients.ts` - Mock service clients

**Why centralized:**
- Reusability across all test types
- Single source of truth for test utilities
- Easier maintenance and updates
- Clear separation from production code

## Running Tests

### All Tests
```bash
bun run test
```

### By Type
```bash
# Unit tests only
bun run test:unit

# NEW: Real HTTP integration tests (requires dev server running)
# First terminal: cd apps/web && bun run dev
# Second terminal:
export TEST_API_KEY='alive_your_key_here'  # Get from UI
bunx vitest run --config vitest.integration.config.ts tests/integration/

# Smoke tests (fast, run on commit)
bun run test:smoke

# Gate tests (comprehensive, run on push)
bun run test:gate
```

### Specific Test File
```bash
bunx vitest run path/to/test.test.ts
```

### Watch Mode
```bash
bunx vitest watch
```

## Writing Tests

### Unit Test Example
```typescript
// packages/core/src/workflow/__tests__/validation.test.ts
import { describe, expect, it } from "vitest"
import { validateWorkflow } from "../validation"

describe("validateWorkflow", () => {
  it("should accept valid workflow", () => {
    const workflow = { /* ... */ }
    expect(validateWorkflow(workflow)).toBe(true)
  })
})
```

### Integration Test Example (NEW STANDARD)
```typescript
// tests/integration/api/v1/invoke.spec.test.ts
import { describe, expect, it, beforeAll, afterAll } from "vitest"

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000"

describe("POST /api/v1/invoke - Real HTTP Integration Test", () => {
  beforeAll(async () => {
    // Verify server is running
    const healthCheck = await fetch(`${BASE_URL}/`, { method: "HEAD" })
    if (!healthCheck.ok) throw new Error(`Server not reachable at ${BASE_URL}`)

    // Setup: create test user, API keys, workflows
  })

  afterAll(async () => {
    // Cleanup: remove test data
  })

  it("should invoke workflow successfully", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "test_001",
        method: "workflow.invoke",
        params: { /* ... */ }
      })
    })

    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result).toHaveProperty("jsonrpc", "2.0")
  })
})
```

**Key differences from old pattern:**
- Uses real HTTP fetch to `http://localhost:3000`
- Tests actual API endpoint, not imported functions
- Validates server is running before tests
- Tests JSON-RPC format and real responses

**Migrating old API tests to new pattern:**
1. Move test from `apps/web/src/app/api/*/` to `tests/integration/api/*/`
2. Replace function imports with fetch() calls
3. Add BASE_URL and server health check
4. Update assertions for HTTP responses

## Best Practices

### DO
✅ Co-locate unit tests with source code
✅ Put integration tests in `tests/integration/`
✅ Put E2E tests in `tests/e2e-essential/`
✅ Use descriptive test names
✅ Clean up test data in `afterAll`/`afterEach`
✅ Mock external services in unit tests
✅ Use real services in integration tests
✅ Keep tests independent and isolated

### DON'T
❌ Put integration tests in the `app/` or `src/` directories
❌ Commit test utilities to production code paths
❌ Skip cleanup in test teardown
❌ Test implementation details
❌ Write tests that depend on other tests
❌ Hardcode credentials or secrets
❌ Use production databases for testing

## Test Configuration

### Vitest Config
- Unit tests: `vitest.config.ts` (per package)
- Integration tests: `vite.integration.config.ts` (root level)

### Environment Variables
Set test-specific environment variables in `.env.test` or pass them directly:

```bash
TEST_API_URL=http://localhost:3000 bunx vitest run
```

For sensitive values like API keys, use environment variables:
```bash
export TEST_API_KEY=alive_your_test_key
```

## CI/CD Integration

### Pre-commit Hook
Runs automatically before each commit:
- Format check
- Type check (`bun run tsc`)
- Smoke tests (`bun run test:smoke`)

### Pre-push Hook
Runs automatically before each push:
- Format check
- Type check
- Core unit tests
- Gate tests (`bun run test:gate`)

### Pull Request Requirements
All PRs must:
1. Pass `bun run tsc` (no type errors)
2. Pass `bun run test:smoke`
3. Pass unit tests for affected packages
4. Include golden trace updates if workflow behavior changed

## Troubleshooting

### "Permission denied" errors
If you encounter RLS permission errors with Supabase in tests, ensure you're using the service role key:
```typescript
const supabase = createStandaloneClient(true) // true = use service role
```

### Tests fail locally but pass in CI
- Check environment variables
- Ensure dev server is running for integration tests
- Rebuild packages: `bun run build`

### Import errors after moving test files
Update import paths to use absolute imports with path aliases:
```typescript
// Before (relative)
import { helper } from "../../helpers/test-auth"

// After (absolute)
import { helper } from "@/helpers/test-auth"
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Next.js Testing Guide](https://nextjs.org/docs/app/guides/testing)

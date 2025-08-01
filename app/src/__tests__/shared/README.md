# Shared Test Infrastructure

Consolidated test utilities, mocks, and helpers to reduce duplication and improve test maintainability across the codebase.

## @runtime/constants Mocking System

**NEW**: Enhanced shared mock system for `@runtime/constants` that eliminates duplicate mock code across 11+ test files.

### Quick Start

```typescript
// Instead of 50+ lines of duplicate mock setup
import { setupGPTestMocks, mockRuntimeConstantsForGP } from "@/__tests__/shared"

describe("MyComponent", () => {
  // Combined setup (recommended)
  const { runService, verificationCache } = setupGPTestMocks({ verbose: false })

  // OR individual mock setup
  mockRuntimeConstantsForGP({ verbose: false, populationSize: 10 })

  it("should handle GP operations", async () => {
    // Your test logic here
  })
})
```

### Available Mock Functions

#### `mockRuntimeConstants(overrides)`

Base mock function with deep merge support for any CONFIG, PATHS, or MODELS overrides.

```typescript
mockRuntimeConstants({
  CONFIG: {
    evolution: {
      GP: { verbose: false, populationSize: 5 },
    },
  },
  MODELS: {
    default: "custom-test-model",
  },
})
```

#### `mockRuntimeConstantsForGP(overrides)`

GP-optimized mock with common settings (verbose: true, populationSize: 1, etc.).

```typescript
mockRuntimeConstantsForGP({
  verbose: false,
  populationSize: 10,
  generations: 5,
})
```

#### `mockRuntimeConstantsForCultural(overrides)`

Cultural evolution optimized mock.

```typescript
mockRuntimeConstantsForCultural({
  culturalIterations: 3,
})
```

#### `mockRuntimeConstantsForDatabase(overrides)`

Database test optimized mock.

```typescript
mockRuntimeConstantsForDatabase({
  enableSpendingLimits: false,
  maxCostUsdPerRun: 100.0,
})
```

### Migration Examples

#### Before (Crossover.test.ts - 19 lines)

```typescript
vi.mock("@/runtime/settings/constants", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/runtime/settings/constants")>()
  return {
    ...mod,
    MODELS: {
      default: "test-model",
    },
    CONFIG: {
      ...mod.CONFIG,
      evolution: {
        ...mod.CONFIG.evolution,
        GP: {
          ...mod.CONFIG.evolution.GP,
          verbose: mockConfig.evolution.GP.verbose,
        },
      },
    },
  }
})
```

#### After (1 line)

```typescript
mockRuntimeConstantsForGP({ verbose: false })
```

#### After (1 line)

```typescript
mockRuntimeConstantsForGP()
```

## Architecture

```
__tests__/shared/
├── mockSetup.ts       # Common mock configurations
├── testHelpers.ts     # Test utility functions
├── constants.ts       # Reusable test constants
└── index.ts          # Central exports
```

## Core Components

### Mock Setup Functions

#### `setupGPTestMocks()`

Complete setup for genetic programming tests. Replaces ~50 lines of boilerplate.

```typescript
const { runService, verificationCache } = setupGPTestMocks()

// Pre-configured mocks include:
// - RunService with all GP operations
// - VerificationCache with validation logic
// - Runtime constants (CONFIG, MODELS, etc.)
// - Workflow generation utilities
```

#### `setupDatabaseTestMocks()`

Database and Supabase client mocking for persistence tests.

```typescript
const { supabase, mockData } = setupDatabaseTestMocks()

// Includes:
// - Supabase client with chained query builders
// - Common database responses
// - Error simulation capabilities
```

#### `setupToolTestMocks()`

Tool execution environment mocking.

```typescript
const { toolRegistry, executionContext } = setupToolTestMocks()

// Provides:
// - Tool registry with discovery mocks
// - Execution contexts with proper typing
// - AI response simulation
```

### Test Helpers

#### `createMockToolExecutionContext()`

Generate standard tool execution contexts with proper typing.

```typescript
const context = createMockToolExecutionContext({
  workflowId: "custom-id",
  additionalData: { key: "value" },
})
```

#### `expectWithinTimeout()`

Async assertion helper with timeout protection.

```typescript
await expectWithinTimeout(async () => {
  const result = await someAsyncOperation()
  expect(result).toBeDefined()
}, 5000)
```

#### `createMockAIResponse()`

Generate realistic AI model responses for testing.

```typescript
const response = createMockAIResponse({
  content: "Custom response",
  toolCalls: [{ name: "search", args: { query: "test" } }],
})
```

## Test Patterns

### Pattern 1: Basic Unit Test

```typescript
import { setupGPTestMocks, resetAllTestMocks } from "@/__tests__/shared"

describe("Population", () => {
  const { verificationCache } = setupGPTestMocks()

  beforeEach(() => resetAllTestMocks())

  it("should validate genomes", async () => {
    verificationCache.verify.mockResolvedValueOnce({ valid: true })

    const result = await population.validate(genome)
    expect(result.valid).toBe(true)
  })
})
```

### Pattern 2: Integration Test

```typescript
import { setupDatabaseTestMocks, TEST_CONSTANTS } from "@/__tests__/shared"

describe("WorkflowPersistence", () => {
  const { supabase } = setupDatabaseTestMocks()

  it("should persist workflow versions", async () => {
    const workflow = TEST_CONSTANTS.mockWorkflow

    await persistence.save(workflow)

    expect(supabase.from).toHaveBeenCalledWith("workflow_versions")
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ wf_version_id: workflow.id })
    )
  })
})
```

### Pattern 3: Error Handling Test

```typescript
describe("ErrorScenarios", () => {
  it("should handle database errors gracefully", async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockRejectedValue(new Error("Connection failed")),
    }))

    await expect(repository.fetch()).rejects.toThrow("Connection failed")
  })
})
```

## Mock Configuration Guide

### Customizing Mock Behavior

```typescript
// Override specific mock behaviors
const { runService } = setupGPTestMocks()

runService.createRun.mockImplementation(async (config) => {
  if (config.maxGenerations > 100) {
    throw new Error("Generation limit exceeded")
  }
  return { runId: "custom-run-id", status: "active" }
})
```

### Partial Mocking

```typescript
// Use only specific mocks
import { mockLogger, mockSupabaseClient } from "@/__tests__/shared/mockSetup"

mockLogger() // Only mock logging
const supabase = mockSupabaseClient() // Only mock Supabase
```

## Performance Testing

### Memory Leak Detection

```typescript
import { performance } from "perf_hooks"

describe("MemoryTests", () => {
  it("should not leak memory", async () => {
    const startMem = process.memoryUsage().heapUsed

    for (let i = 0; i < 1000; i++) {
      const { runService } = setupGPTestMocks()
      await runService.createRun({})
    }

    global.gc?.() // Force garbage collection if available
    const endMem = process.memoryUsage().heapUsed

    expect(endMem - startMem).toBeLessThan(10 * 1024 * 1024) // 10MB threshold
  })
})
```

### Benchmark Testing

```typescript
import { bench } from "vitest"

bench(
  "genome validation performance",
  async () => {
    const { verificationCache } = setupGPTestMocks()
    const genome = createLargeGenome()

    await verificationCache.verify(genome)
  },
  { iterations: 1000 }
)
```

## Test Coverage Guidelines

### Minimum Coverage Requirements

- **Unit Tests**: 80% line coverage
- **Integration Tests**: Critical paths covered
- **Edge Cases**: Error scenarios, boundary conditions
- **Performance**: Benchmarks for critical operations

### Coverage Commands

```bash
# Run tests with coverage
bun run test --coverage

# Generate HTML report
bun run test --coverage --reporter=html

# Check coverage thresholds
bun run test --coverage --coverage.lines=80
```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run tests
        run: bun run test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```json
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

bun run test --changed
```

## Troubleshooting

### Common Issues

#### Issue: "Cannot find module" errors

```typescript
// Solution: Check tsconfig paths
{
  "paths": {
    "@/__tests__/shared": ["./src/__tests__/shared/index.ts"],
    "@/__tests__/shared/*": ["./src/__tests__/shared/*"]
  }
}
```

#### Issue: Mock not resetting between tests

```typescript
// Solution: Use afterEach consistently
afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})
```

#### Issue: Async test timeouts

```typescript
// Solution: Increase timeout for specific tests
it(
  "should handle long operations",
  async () => {
    // test logic
  },
  { timeout: 10000 }
)
```

### Debug Mode

Enable detailed test logging:

```typescript
// Set environment variable
process.env.TEST_DEBUG = "true"

// Or in test file
import { enableTestDebug } from "@/__tests__/shared"
enableTestDebug()
```

## Best Practices

1. **Keep Mocks Minimal**: Only mock external dependencies
2. **Test Behavior, Not Implementation**: Focus on outcomes
3. **Use Descriptive Names**: Clear test descriptions aid debugging
4. **Isolate Tests**: Each test should be independent
5. **Mock at Boundaries**: Mock at system boundaries (DB, API, etc.)

## Migration Checklist

When migrating existing tests:

- [ ] Identify duplicate mock setup
- [ ] Import shared utilities
- [ ] Replace duplicate code
- [ ] Verify tests still pass
- [ ] Update imports to use barrel exports
- [ ] Remove unused imports
- [ ] Add to migration tracking

## Contributing

When adding new shared utilities:

1. **Check for existing patterns** before creating new ones
2. **Document new utilities** with usage examples
3. **Export from index.ts** for discoverability
4. **Add tests** for the utilities themselves
5. **Update this README** with new patterns

## Related Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](../../../docs/testing.md)
- [Mock Service Worker](https://mswjs.io/) for API mocking
- [Testing Library](https://testing-library.com/) for component testing

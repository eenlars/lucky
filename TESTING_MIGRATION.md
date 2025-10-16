# Testing Structure Migration

This document summarizes the improvements made to the testing infrastructure.

## What Changed

### 1. Centralized Path Aliases
**File**: `tsconfig.paths.json`
- Single source of truth for all path aliases
- Used by both TypeScript and Vitest
- Eliminates duplication across configs

### 2. Shared Test Configuration
**Package**: `packages/test-config/`
- `vitest.base.ts` - Base configuration for all test projects
- `workspace.ts` - Multi-project workspace definition
- `plugins.ts` - Shared Vite plugins (tsconfigPaths)
- `setup.global.ts` - Global test setup

### 3. Workspace-Based Testing
**File**: `vitest.workspace.ts`
- Defines 6 test projects with clear names:
  - `pkg-unit` - Package unit tests (*.test.ts)
  - `pkg-int` - Package integration tests (*.spec.test.ts)
  - `app-unit` - App unit tests
  - `app-int` - App integration tests
  - `xrepo` - Cross-repo integration tests
  - `e2e` - End-to-end golden tests

### 4. MSW Test Mocking
**Directory**: `tests/msw/`
- `handlers/` - Service-specific HTTP mocks (OpenAI, Anthropic, GitHub)
- `fixtures/` - JSON response fixtures
- `scenarios/` - Reusable test scenarios
- `server.ts` - MSW server setup utilities

### 5. Updated Package Configs
**Updated files**:
- `packages/core/vitest.config.ts` - Simplified, uses shared config
- `packages/models/vitest.config.ts` - New, uses shared config
- `packages/mcp-server/vitest.config.ts` - New, uses shared config
- `vitest.config.ts` - Root config for cross-repo tests

### 6. New Test Commands
**package.json scripts**:
```bash
bun test:pkg-unit     # Package unit tests
bun test:pkg-int      # Package integration tests
bun test:app-unit     # App unit tests
bun test:app-int      # App integration tests
bun test:xrepo        # Cross-repo integration
bun test:e2e          # E2E golden tests
```

### 7. Documentation
**New files**:
- `docs/TESTING.md` - Comprehensive testing guide
- `TESTING_MIGRATION.md` - This file
- `tests/msw/README.md` - MSW usage guide

**Updated files**:
- `CLAUDE.md` - Updated test organization section

## Benefits

1. **Clear Organization** - Tests are categorized by type and easy to find
2. **Consistent Configuration** - All tests use shared base config
3. **Better Mocking** - MSW provides clean HTTP mocking
4. **Faster Execution** - Run only the tests you need
5. **Better DX** - Clear project names, consistent timeouts, globals enabled

## Migration Guide

### For Existing Tests

Tests don't need changes! The naming convention determines which project they run in:

- `*.test.ts` → unit tests
- `*.spec.test.ts` → integration tests

### For New Tests

1. **Unit tests**: Create `*.test.ts` files
   - Fast, isolated tests
   - Use dependency injection + fakes
   - No external dependencies

2. **Integration tests**: Create `*.spec.test.ts` files
   - Test multiple components together
   - Use MSW for HTTP mocking
   - Longer timeouts (30s-120s)

3. **MSW Setup**:
```typescript
import { createTestServer } from "@tests/msw/server"
import { openaiHandlers } from "@tests/msw/handlers"

const server = createTestServer(...openaiHandlers())
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
```

### Running Tests

```bash
# Run specific project
bun test:pkg-unit

# Watch mode
bunx vitest -w --project pkg-unit

# Coverage
bunx vitest --coverage --project pkg-unit

# Legacy commands still work
bun test:smoke
bun test:gate
```

## Next Steps

1. **Add MSW handlers** - Create handlers for other external APIs as needed
2. **Convert existing mocks** - Gradually migrate to MSW
3. **Add test scenarios** - Create reusable test scenarios in `tests/msw/scenarios/`
4. **Update CI/CD** - Use new test commands in CI pipelines

## Rollback

If needed, the old test setup can be restored by:
1. Reverting `vitest.workspace.ts`
2. Reverting package `vitest.config.ts` files
3. Removing `packages/test-config/`
4. Removing `tests/msw/`

All existing tests still work with the new structure.

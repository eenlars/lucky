# Testing Structure Migration

Migration to a clear, organized testing infrastructure following the specification.

## Implementation Summary

### ✅ What Was Implemented

1. **Centralized Path Aliases** (`tsconfig.paths.json`)
   - Single source of truth for all path aliases
   - Includes `@repo/*`, `@lucky/*`, `@core/*`, `@examples/*`, `@tests/*`
   - Extended by all package tsconfigs

2. **Shared Test Configuration** (`packages/test-config/`)
   - `vitest.base.ts` - Base configuration function
   - `plugins.ts` - Shared Vite plugins (tsconfigPaths)
   - `setup.global.ts` - Global test setup (timezone, CI settings)
   - `workspace.ts` - Workspace definition (reference, not used directly)

3. **Multi-Project Root Config** (`vitest.config.ts`)
   - Uses `defineConfig` with `test.projects` (not deprecated workspace file)
   - Six clear test projects: pkg-unit, pkg-int, app-unit, app-int, xrepo, e2e
   - Leverages shared baseConfig from @repo/test-config

4. **Per-Package Configs**
   - Thin configs that use `@repo/test-config/vitest.base`
   - Example: `packages/core/vitest.config.ts`

5. **MSW Test Infrastructure** (`tests/msw/`)
   - Handlers for OpenAI, Anthropic, GitHub
   - Server setup utilities
   - README with usage examples

6. **Documentation** (`docs/`)
   - `TESTING.md` - Comprehensive testing guide
   - `TESTING_MIGRATION.md` - This file

## Test Organization

```
packages/*/src/**/*.test.{ts,tsx}          → pkg-unit
packages/*/src/**/*.spec.test.{ts,tsx}     → pkg-int
apps/web/src/**/*.test.{ts,tsx}            → app-unit
apps/web/src/**/*.spec.test.{ts,tsx}       → app-int
tests/integration/**/*.test.{ts,tsx}       → xrepo
tests/e2e-essential/**/*.test.{ts,tsx}     → e2e
```

## Running Tests

```bash
# By project
bunx vitest --project pkg-unit
bunx vitest --project pkg-int
bunx vitest --project xrepo
bunx vitest --project e2e

# Legacy (still work)
bun test:smoke  # ✅ PASSING
bun test:gate

# TypeScript
bun run tsc     # ✅ PASSING
```

## Files Created/Modified

### Created
- `tsconfig.paths.json` - Centralized path aliases
- `packages/test-config/` - Shared test configuration package
- `tests/msw/` - MSW mocking infrastructure
- `docs/TESTING.md` - Testing documentation
- `docs/TESTING_MIGRATION.md` - This file

### Modified
- `vitest.config.ts` - Multi-project config using test.projects
- `packages/core/vitest.config.ts` - Uses @repo/test-config
- `packages/tools/tsconfig.json` - Extends tsconfig.paths.json
- `tsconfig.paths.json` - Complete path alias mappings
- `docs/TESTING.md` - Updated with new structure
- `CLAUDE.md` - Updated testing section

### Deleted
- `vitest.workspace.ts` - Deprecated in favor of test.projects in root config
- `packages/models/vitest.config.ts` - Not needed
- `packages/mcp-server/vitest.config.ts` - Not needed

## Verification

✅ **TypeScript compilation** - Passing  
✅ **Smoke tests** - 1/1 tests passing  
✅ **Test projects** - All 6 projects discoverable and running  
✅ **Path aliases** - Working in all contexts  
✅ **MSW infrastructure** - Created and documented  

## Known Issues

- 33 pre-existing test failures in pkg-unit (not related to test structure)
- Some dynamic import path resolution issues in integration tests (pre-existing)

## Next Steps

1. Fix pre-existing test failures (separate from this migration)
2. Add more MSW handlers as needed
3. Create test scenarios in `tests/msw/scenarios/`
4. Gradually migrate tests to use MSW

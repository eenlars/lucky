# Testing Guide

This is the definitive testing reference for the monorepo. It explains how suites are organized, which configs power them, how to run and filter quickly, how to handle environment variables safely, and the current standards for mocking, coverage, CI hooks, and golden tests.

## At a Glance

- All tests: `bun run test`
- Unit (package-local): `bun turbo run test:unit --filter=@lucky/core`
- Cross-repo integration (real HTTP):
  - Terminal A: `cd apps/web && bun run dev`
  - Terminal B: `bunx vitest run tests/integration`
- Essential E2E (golden): `bun run test:smoke` (commit) and `bun run test:gate` (push)
- Typecheck (all): `bun run tsc`
- Build (graph-aware): `bun run build`
- Scope by workspace: `bun turbo run test --filter=@lucky/models`

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

### Repository Map for Testers

- `apps/web` (Next.js UI + API routes)
  - Unit tests for app logic and components; separate config for app integration specs.
- `packages/core` (workflow engine + algorithms)
  - Rich unit and integration split via Vitest projects; fakes and fixtures live under `src/__tests__`.
- `packages/shared` (shared utilities)
  - Lightweight unit tests; built with `tsup`.
- `packages/models`, `packages/tools`, `packages/adapter-supabase`, `packages/mcp-server`
  - Package-local unit tests; some packages have their own vitest setup.
- `tests/integration` (cross-cutting, real HTTP)
  - Exercises API contracts and auth. Requires dev server.
- `tests/e2e-essential` (smoke + gate, golden)
  - Deterministic guardrail using normalized hashes.

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
- `tests/integration/api/v1/invoke.spec.test.ts` - **CURRENT STANDARD: Real HTTP API testing**
- `tests/integration/sdk-integration.test.ts` - SDK integration validation

**CURRENT STANDARD for API Testing (Introduced 2025):**
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

# CURRENT STANDARD: Real HTTP integration tests (requires dev server running)
# First terminal: cd apps/web && bun run dev
# Second terminal:
export TEST_API_KEY='alive_your_key_here'  # Get from UI
bunx vitest run tests/integration/

# Smoke tests (fast, run on commit)
bun run test:smoke

# Gate tests (comprehensive, run on push)
bun run test:gate
```

### Suite Matrix: What Runs Where

- `packages/*/src/**/*.test.ts` → Package unit tests (Node env)
- `packages/*/src/**/*.spec.test.ts` → Package integration tests (Node env, longer timeouts)
- `apps/web/src/**/*.test.ts` → App unit tests (Node env today; move to jsdom for UI when needed)
- `apps/web/src/**/*.spec.test.ts` → App integration tests (Node env)
- `tests/integration/**` → Cross-repo integration (Node env, real HTTP)
- `tests/e2e-essential/**` → Essential E2E smoke/gate (single-thread, deterministic)

### Specific Test File
```bash
bunx vitest run path/to/test.test.ts
```

### Watch Mode
```bash
bunx vitest watch
```

### Turbo Scoping and Fast Iteration
```bash
# Scope to a single workspace
bun turbo run test --filter=@lucky/core

# Only unit tests in core (uses its vitest projects)
bun turbo run test:unit --filter=@lucky/core

# Build only shared, then test dependents
bun turbo run build --filter=@lucky/shared && bun turbo run test --filter=...dependents
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

## Mocking Strategy (Current Standard)

- Unit tests (preferred):
  - Favor pure functions and dependency injection at boundaries.
  - Provide small fake implementations for SDK/IO adapters instead of deep mocks.
  - Control time and randomness with Vitest fake timers and seeded randoms.
- Package integration tests:
  - Use MSW (Node) or undici interceptors for HTTP boundaries; validate serialization and error paths.
  - Avoid mocking internal modules; mock only external boundaries.
- Cross-repo integration:
  - Hit real HTTP to the dev server for API routes; use MSW for 3rd-party calls if required to remain offline.
- Essential E2E:
  - Minimize mocks; normalize only nondeterministic fields (timestamps, ids) before hashing.

Suggested utilities: `msw`, `@testing-library/*` (when UI tests move to jsdom), and a small “test data builder” helper or factory per package.

## Writing Tests

### Integration Test Example (CURRENT STANDARD)
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

## Test Configuration

### Vitest Config
- Unit tests: `vitest.config.ts` (per package)
- Integration tests: `vitest.config.ts` (root level)

### Configuration Index (Paths)

- Root integration: `vitest.config.ts`
- E2E essential: `tests/e2e-essential/vitest.config.js`
- App unit: `apps/web/vite.config.ts`
- App integration: `apps/web/vite.integration.config.ts`
- Core package: `packages/core/vitest.config.ts`
- Models package: `packages/models/vitest.config.ts`
- MCP server: `packages/mcp-server/vitest.config.ts`
- Root TS refs: `tsconfig.base.json`
- Test TS configs: `tests/integration/tsconfig.json`, `tests/e2e-essential/tsconfig.json`

## Environment Profiles & Secrets Policy

- Unit
  - No real secrets. Tests must pass with placeholders (e.g., keys starting with `test-`).
  - Provide defaults via a small helper (e.g., `tests/helpers/test-env.ts`) and assert no production-like values are present.
- Package/App Integration
  - Allow whitelisted env needed for local fakes; still default to placeholders. Skip live-only tests if keys are missing.
- Cross-repo Integration
  - Use `.env.test` explicitly. Do not read `.env.local` in CI. Start app dev server in a separate terminal.
  - Permit “live-ish” services behind explicit flags; add a health-check and skip if unavailable.
- Essential E2E
  - No external secrets or network; rely on committed fixtures and normalization.

Set test-specific environment variables in `.env.test` or pass them directly:

```bash
TEST_API_URL=http://localhost:3000 bunx vitest run
```

## Vitest Topology (Current)

- Root integration runner (single project)
  - File: `vitest.config.ts`
  - Runs `tests/integration/**` in Node env; aliases for `@lucky/shared`, `@lucky/core`, `@lucky/tools`, `@` (web), and `@tests`.
  - Coverage: `coverage-integration/` (currently focused on `apps/web/src/**/*`).

- Packages
  - `packages/core/vitest.config.ts`
    - `vite-tsconfig-paths` plugin; Node env; two projects:
      - `unit`: `src/**/*.test.ts`; setup `src/__tests__/test-setup.ts`.
      - `integration`: `src/**/*.spec.test.ts`; longer timeouts; setup `src/__tests__/integration-setup.ts`.
    - Coverage: `packages/core/coverage/` (V8 provider) with broad excludes; avoids prebundling puppeteer/stealth.
  - `packages/models/vitest.config.ts`
    - Node env; includes both `*.test.ts` and `*.spec.test.ts`.
  - `packages/mcp-server/vitest.config.ts`
    - Node env; `vitest.setup.ts`; higher timeout; `passWithNoTests: true`.

- App (Next.js)
  - `apps/web/vite.config.ts`
    - Node env; excludes `**/*.spec.test.ts` (those are app integration); mocks `elkjs` when `mode === test`; setup `src/test-setup.ts`; coverage `apps/web/coverage/`.
  - `apps/web/vite.integration.config.ts`
    - Node env; includes only `**/*.spec.test.ts`; coverage `apps/web/coverage-integration/`.

- Essential E2E
  - `tests/e2e-essential/vitest.config.js`
    - Single thread for determinism; setup `tests/e2e-essential/setup/env.ts`; aliases `@core`, `@examples`, `@shared`.
    - Golden-trace smoke + gate with `tests/e2e-essential/golden/*.hash`.

## TypeScript Config and Aliasing

- Root references: `tsconfig.base.json` references `packages/shared`, `packages/core`, `apps/examples`, `apps/web`.
- `packages/core/tsconfig.json`: `moduleResolution: bundler`, `noEmit: true`, rich `paths` for `@core/*` and `@lucky/*`.
- `packages/shared/tsconfig.json`: extends `tsconfig.build.json`, `noEmit: true` for editor/tests; tsup handles builds.
- `apps/web/tsconfig.json`: Next plugin; `@/*` and `@lucky/*` plus `@core/*` paths; excludes heavy dirs.
- `tests/integration/tsconfig.json` and `tests/e2e-essential/tsconfig.json`: workspace-aware `paths`; e2e adds `types: ['vitest/globals']`.
- Alias resolution strategy:
  - In packages, `vite-tsconfig-paths` honors `tsconfig.json` paths (e.g., core).
  - Root integration and e2e configs set aliases explicitly for stability outside app bundling.

## Turbo Tasks and Environment

- Source: `turbo.json`
  - `build`, `test`, `test:unit`, `test:integration`, `coverage`, `tsc` depend on `^build`.
  - `dev` is `persistent: true`, `cache: false`.
  - `globalEnv` enumerates keys surfaced during builds/tests; root scripts also pass `--env-file .env --env-file .env.local`.
  - Outputs cached where configured (coverage directories, `.next/**` minus cache).

## Coverage Layout

- Packages: `packages/<name>/coverage/` (V8 provider).
- App unit: `apps/web/coverage/`; app integration: `apps/web/coverage-integration/`.
- Root integration: `coverage-integration/` at repo root.
- No repo-wide coverage merge configured by default.

Optional (CI enhancement): collect `**/coverage/**/coverage-final.json` and merge to a single LCOV/HTML report using Istanbul’s merge tools before upload.

## Environment and Determinism

- Scripts load `.env` and `.env.local`; ensure secrets are not committed. Tests that rely on live services should detect placeholder keys and skip accordingly.
- Essential E2E computes a normalized hash and compares to golden. Update via `bunx tsx tests/e2e-essential/scripts/update-golden.ts` after intentional changes.

For sensitive values like API keys, use environment variables:
```bash
export TEST_API_KEY=alive_your_test_key
```

## Essential E2E Golden Details

- Golden input fixture: resolved via workspace alias from `@lucky/core` resources.
- Normalization rules (tests/e2e-essential/utils/goldenTrace.ts):
  - Removes keys: `timestamp`, `time`, `createdAt`, `updatedAt`, `id`, `_id`, plus any provided `redactKeys`.
  - Sorts object keys for determinism and normalizes floating precision (rounds to 1e-6).
- Update flow: after intentional changes, run `bunx tsx tests/e2e-essential/scripts/update-golden.ts` and commit the new hash under `tests/e2e-essential/golden/`.

## Add a New Package/App: Checklist

1) Co-locate unit tests under `src/**/__tests__` using `*.test.ts`.
2) Add `vitest.config.ts` that extends our current patterns (Node env, `vite-tsconfig-paths`), and optionally split `unit` vs `integration` projects if needed.
3) Ensure `tsconfig.json` has proper `paths` and `noEmit: true`; rely on `tsup` or app build for emits.
4) Add scripts in the package `package.json` for `test`, `test:unit`, and `test:integration` if you split suites.
5) For HTTP boundaries, add MSW handlers under `src/__tests__/msw/*.handlers.ts` and a tiny `test-setup.ts` to start/stop the server.
6) Keep environment usage to placeholders in unit tests; add integration-only env flags if truly needed.
7) If the package participates in cross-repo integration, add scenarios under `tests/integration/**` instead of testing via direct imports.
8) If the package introduces deterministic workflow changes, consider adding or updating a golden gate spec.

## CI/CD Integration

### Pre-commit Hook (`.husky/pre-commit`)
Runs automatically before each commit:
- Format staged files (lint-staged + biome)
- Type check (`bun run tsc`)
- Smoke tests (`bun run test:smoke`)

### Pre-push Hook (`.husky/pre-push`)
Runs automatically before each push:
- Type check (`bun run tsc`)
- Core unit tests (quiet) → logs: `.husky/.prepush_core.log`
- Gate tests (quiet) → logs: `.husky/.prepush_gate.log`

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

## Known Issues / Non‑ideal Patterns (CURRENT)

- Duplicate alias definitions across tsconfigs and Vitest configs → drift risk (`@lucky/*`, `@core/*`, `@/*`).
- Root integration coverage currently includes only `apps/web/src/**/*` → may under-report package coverage.
- `apps/web` uses `environment: 'node'` for tests → DOM-based component tests would need `jsdom`/`happy-dom`.
- Two app test configs (unit vs integration) → easy to misclassify specs.
- Env injection via `--env-file` for all scripts → ensure CI is explicit and no secrets are committed.
- Pre-push runs only core unit + gate → unit failures in other packages can slip pre-push (CI expected to catch).
- `lint` depends on `^build` in `turbo.json` → slows linting unnecessarily.
- Mixed alias styles in docs/tests/configs → contributor confusion.
- Reassigning `process.env` in Vitest configs works but can be surprising.
- No coverage thresholds → reports are informational only.
- `moduleResolution: bundler` everywhere aligns with Vite but differs from Node’s `nodenext` semantics.

## Open Questions / Items Under Review

- Expand root integration coverage to include packages or keep app-centric scope?
- Standardize on `vite-tsconfig-paths` everywhere vs explicit aliases in some contexts?
- Switch apps/web to `jsdom`/`happy-dom` by default or keep Node for current logic-heavy tests?
- Widen pre-push with a cheap changed-only unit pass across packages without big latency?

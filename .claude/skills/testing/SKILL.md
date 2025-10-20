---
name: Testing a repository well
description: Test the repo.
---

## Three Core Rules (see `/CLAUDE.md` - Test Engineering Learnings)
1. Test everything you build
2. When tests fail: check code first, never assume
3. Read implementation before changing test expectations

## Test Structure
```
*.test.ts            → unit (fast, isolated)
*.spec.test.ts       → integration (multiple components)
tests/integration/** → cross-repo
tests/e2e-essential/ → golden tests
```
All in `__tests__/` dirs. See `docs/TESTING.md` for details.

## Running Tests
```bash
bun run test                    # all unit tests
bun run test MyFile.test.ts    # specific file
bun run test -t "pattern"      # by name

bunx vitest --project pkg-unit    # unit tests
bunx vitest --project pkg-int     # integration
bunx vitest --project xrepo       # cross-repo
bunx vitest --project e2e         # e2e

bunx vitest --project pkg-unit --watch    # watch mode
bunx vitest --coverage --project pkg-unit # coverage
```
Legacy: `bun test:smoke`, `bun test:gate` work.

## Configuration
**Root:** `vitest.config.ts` (multi-project)
**Shared:** `packages/test-config/`
  - `vitest.base.ts` - base config
  - `plugins.ts` - tsconfig path resolution
  - `setup.global.ts` - global setup
**Aliases:** `@lucky/`, `@core/`, `@tests/`, `@examples/`, `@/`
See `docs/TESTING_MIGRATION.md`

## Test Template
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { setupCoreTest, mockRuntimeConstantsForGP } from "@core/utils/__tests__/setup/coreMocks"

describe("MyFunction", () => {
  beforeEach(() => {
    setupCoreTest()
    // Add mockRuntimeConstantsForGP() if uses CONFIG.*
  })
  it("should do X", async () => { })
})
```
**Mock what you need:**
- `CONFIG.*` → `mockRuntimeConstantsForGP()`
- APIs → Mock clients
- DB → Mock supabase
- FS → Mock fs
- Other → `vi.mock("@module", ...)`

Templates: `packages/core/src/__tests__/TESTING.md`

## MSW (HTTP Mocking)
```typescript
import { createTestServer } from "@tests/msw/server"
import { openaiHandlers } from "@tests/msw/handlers"

const server = createTestServer(...openaiHandlers())
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
```
Handlers: `openaiHandlers()`, `anthropicHandlers()`, `githubHandlers()`
Options: `{ fail: true }`, `{ rateLimited: true }`, `{ delay: 1000 }`

## Vitest Pitfalls (see `/CLAUDE.md` - Test Engineering Learnings)
- No `vi.hoisted()` - remove it
- Mocks inside factory avoid initialization errors
- Direct references, not destructuring: `vi.mock("@/logger", () => ({ lgg: mockLoggerInstance }))`
- Different paths (relative vs absolute) = mock conflicts → use absolute imports + minimal mocks

## Before Fixing Tests
**Read implementation first.** Process: implementation → transformations → update tests → fix code (if needed).

## Test Failures Quick Fix
| Error | Fix |
|-------|-----|
| Property undefined | CONFIG mock or `mockRuntimeConstantsForGP()` |
| Cannot access before initialization | Mock inside `vi.mock(() => {})` |
| Module not found | Check tsconfig aliases |
| Spy not called | Use `vi.mocked(Module)` |
| Pass locally, fail in CI | Fix flaky timeouts, use fixed timestamps |

## Zustand Multi-Select (SSR Fix)
```typescript
import { useShallow } from "zustand/react/shallow"
const { v1, v2 } = useStore(useShallow(s => ({ v1: s.v1, v2: s.v2 })))
```
Prevents SSR hydration loops.

## Best Practices
- Unit = pure logic, Integration = dependencies, E2E = critical paths only
- Mock APIs, use injection, avoid setTimeout
- No flaky timeouts, reset mocks, use fixed timestamps
- Test behavior not implementation
- Clear names, describe(), easy failures

## Docs
- `docs/TESTING.md` - complete guide
- `docs/TESTING_MIGRATION.md` - infrastructure
- `packages/core/src/__tests__/TESTING.md` - quick-start templates
- `CLAUDE.md` - test learnings

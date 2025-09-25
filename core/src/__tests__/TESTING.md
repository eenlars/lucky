# Testing Guide - Quick Start

## 🚀 Step 1: Copy This Starter Code

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  setupCoreTest,
  mockRuntimeConstantsForGP,
  createMockGenome,
  createMockWorkflowConfig,
} from "@core/utils/__tests__/setup/coreMocks"

describe("MyFunction", () => {
  beforeEach(() => {
    setupCoreTest() // Always include this
    // Add mockRuntimeConstantsForGP() if your function uses CONFIG.*
  })

  it("should do something", async () => {
    // Your test here
  })
})
```

## 🎯 Step 2: What Does Your Function Use?

**Check your function and tick boxes:**

- [ ] `CONFIG.*` → Add `mockRuntimeConstantsForGP()` to beforeEach
- [ ] External APIs (OpenAI, Anthropic) → Mock the client
- [ ] Database operations → Mock supabase
- [ ] File system → Mock fs operations
- [ ] Other modules → Mock with `vi.mock("@module", ...)`

## 📋 Step 3: Pick Your Template

### 🧠 Testing Evaluators/Scorers

```typescript
describe("MyEvaluator", () => {
  beforeEach(() => {
    setupCoreTest()
    mockRuntimeConstantsForGP()
  })

  it("should evaluate successfully", async () => {
    const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")
    vi.mocked(AggregatedEvaluator).mockImplementation(() => ({
      evaluate: vi.fn().mockResolvedValue({
        success: true,
        data: { fitness: { score: 0.8 } },
        usdCost: 0.05,
      }),
    }))

    // Test your evaluator
    const result = await myEvaluator.evaluate(createMockGenome())
    expect(result.success).toBe(true)
  })
})
```

### ⚡ Testing Workflow Functions

```typescript
describe("MyWorkflowFunction", () => {
  beforeEach(() => {
    setupCoreTest()
  })

  it("should process workflow", async () => {
    const { Workflow } = await import("@core/workflow/Workflow")
    vi.mocked(Workflow.create).mockResolvedValue({
      success: true,
      data: createMockWorkflowConfig(),
      usdCost: 0.01,
    })

    const result = await myWorkflowFunction(input)
    expect(result).toBeDefined()
  })
})
```

### 💾 Testing Database Operations

```typescript
describe("MyDatabaseFunction", () => {
  beforeEach(() => {
    setupCoreTest()
  })

  it("should save to database", async () => {
    const { supabase } = await import("@core/utils/clients/supabase/client")
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null, data: [{ id: "test-id" }] }),
    })

    const result = await myDatabaseFunction(data)
    expect(result).toBeDefined()
  })
})
```

### 🔧 Testing Tool Integration

```typescript
describe("MyToolFunction", () => {
  beforeEach(() => {
    setupCoreTest()
  })

  it("should use tools", async () => {
    const { codeToolAutoDiscovery } = await import("@core/tools/code/AutoDiscovery")
    vi.mocked(codeToolAutoDiscovery.discoverTools).mockResolvedValue([{ name: "testTool", description: "test" }])

    const result = await myToolFunction()
    expect(result).toBeDefined()
  })
})
```

### 🤖 Testing AI API Calls

```typescript
describe("MyAIFunction", () => {
  beforeEach(() => {
    setupCoreTest()
  })

  it("should call AI", async () => {
    const { sendAI } = await import("@core/messages/api/sendAI")
    vi.mocked(sendAI).mockResolvedValue({
      success: true,
      data: { message: { role: "assistant", content: "response" } },
      usdCost: 0.001,
    })

    const result = await myAIFunction(prompt)
    expect(result.success).toBe(true)
  })
})
```

## 🚨 When Tests Fail - Quick Fixes

| Error                                              | Fix                                                       |
| -------------------------------------------------- | --------------------------------------------------------- |
| `Cannot read property X of undefined`              | Add X to CONFIG mock or use `mockRuntimeConstantsForGP()` |
| `Cannot access 'mockVar' before initialization`    | Move mock inside `vi.mock(() => {})`                      |
| `Module not found` / `undefined is not a function` | Check import paths match `tsconfig.json` aliases          |
| `Invalid environment variables`                    | Already handled by test-setup.ts                          |
| `Expected spy to be called`                        | Use `vi.mocked(Module)` to access mock functions          |

## 🎮 Commands

```bash
bun run test                    # Run all unit tests
bun run test MyFile.test.ts     # Run specific test file
bun run test -t "should do X"   # Run specific test
```

## 💡 Pro Tips

- **Copy template first**, then modify for your needs
- **Read the actual implementation** to see what it calls/returns
- **Test real behavior**, not mock behavior
- **Use `.only` to focus on one test** while debugging
- **Check the implementation before assuming test expectations are correct**

## 🔍 Advanced Mock Patterns

**Per-test overrides:**

```typescript
const { Module } = await import("@module")
vi.mocked(Module).mockImplementation(() => ({ method: vi.fn() }))
```

**Class static methods:**

```typescript
vi.mock("@module", () => {
  const MockClass = vi.fn()
  MockClass.staticMethod = vi.fn()
  return { MyClass: MockClass }
})
```

**Chained methods (Supabase):**

```typescript
vi.mock("@supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  },
}))
```

**Testing errors:**

```typescript
expect(() => func()).toThrow("error message")
await expect(asyncFunc()).rejects.toThrow()
mockFn.mockRejectedValue(new Error("test error"))
```

## 🚨 Global Mock Conflicts

**Problem:** Global mocks from other test files can interfere with your tests.
**Example:** `EvolutionEngine.test.ts` has `vi.mock("../Population")` that breaks Population tests.
**Root Cause:** Different module paths (relative vs absolute) prevent proper unmocking.
**Solution:** Create isolated tests with minimal mocking instead of fighting global mocks.

```typescript
// ❌ Fighting global mocks - fragile and complex
vi.unmock("../Population") // May not work if paths don't match

// ✅ Isolated minimal mocking - robust and clear
vi.mock("@core/utils/logging/Logger", () => ({
  lgg: { info: vi.fn(), log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    /* minimal config needed */
  },
}))
// Only mock what the class actually needs
```

**Fix for Select.test.ts specifically:** Use separate test file or doMock pattern:

```typescript
// Use dynamic imports with doMock for conflicting modules
beforeEach(async () => {
  vi.doMock("@runtime/settings/constants", () => ({ CONFIG: mockConfig }))
  const { Select } = await import("@core/improvement/gp/Select")
  // Use Select in test
})
```

# last step

if you found something that should be included in this concise instruction file, add it concisely. DO NOT do this for everything. also: make it very very generic.

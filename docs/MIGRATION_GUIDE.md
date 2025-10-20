# Migration Guide: Deprecated Code Patterns

**Last Updated:** 2025-10-16
**Status:** 6 deprecated items removed, 9 remain
**Goal:** Remove all deprecated code by end of Q1 2026

Organized by priority for efficient cleanup. Start with Phase 1 quick wins.

---

## Quick Reference

| Item | Replacement | Priority | Files | Effort |
|------|-------------|----------|-------|--------|
| `Mutations` class | `MutationCoordinator` | 🔴 High | 3 | 2h |
| `getWorkflowInvocationId()` | Multiple ID tracking | 🔴 High | 3 | 3h |
| `PROVIDER_CONFIGS` | `getProviderConfigs()` | 🟡 Medium | 2+7 | 1h |
| `supabase` proxy | `getSupabase()` | 🟡 Medium | 9 | 2h |
| `coreMocks` functions | Direct `configMocks` | 🟢 Low | 13 | 30min |
| `calculateCost()` | `calculateCostV2()` | 🟢 Low | 0 | 5min |
| `AgentStepsLegacy` | `AgentSteps` | 🟢 Low | 2 | 30min |
| `LegacyToolUsage` | `AgentSteps` | 🟢 Low | 1 | 30min |
| `gp/resources/types.ts` | Direct import | 🟢 Low | 12 | 15min |

---

## Migration Strategy

### Phase 1: Quick Wins (~2h total)
Low-risk, high-value cleanups. Start here:

1. **calculateCost wrapper** (5min) - Remove no-op wrapper
2. **gp/resources/types.ts** (15min) - Remove re-export file
3. **coreMocks functions** (30min) - Test utilities only
4. **AgentStepsLegacy** (30min) - UI type update
5. **LegacyToolUsage** (30min) - UI type update

### Phase 2: Medium Risk (~3h total)
Requires testing but straightforward:

6. **PROVIDER_CONFIGS** (1h) - Static → dynamic config
7. **supabase proxy** (2h) - Explicit error handling

### Phase 3: High Risk (~5h total)
Core functionality changes, thorough testing required:

8. **Mutations → MutationCoordinator** (2h) - Evolution algorithm
9. **getWorkflowInvocationId** (3h) - Invocation tracking

---

## Detailed Migrations

### 1. calculateCost() → calculateCostV2()

**Priority:** 🟢 Low | **Effort:** 5min | **Risk:** None

#### Status
- **Current imports:** 0 (wrapper only, no direct usage)
- **File:** `packages/core/src/messages/api/vercel/pricing/calculatePricing.ts`

#### What to do

```typescript
// DELETE THIS FUNCTION (line ~35):
export function calculateCost(model: string, usage: TokenUsage): number {
  return calculateCostV2(model, usage) // Just a passthrough
}
```

#### Verification

```bash
# Should return nothing:
rg "calculateCost\(" --type ts | grep -v calculateCostV2
bun run tsc  # Should pass
```

---

### 2. gp/resources/types.ts Re-export

**Priority:** 🟢 Low | **Effort:** 15min | **Risk:** None

#### Status
- **Current imports:** 12 files
- **Re-export file:** `packages/core/src/improvement/gp/resources/types.ts`
- **Source file:** `packages/core/src/improvement/gp/gp.types.ts`

#### What to do

```bash
# Find all imports:
rg "from.*improvement/gp/resources/types" --type ts

# Replace with direct import:
# OLD: from "@core/improvement/gp/resources/types"
# NEW: from "@core/improvement/gp/gp.types"

# Delete re-export file:
rm packages/core/src/improvement/gp/resources/types.ts
```

#### Verification

```bash
bun run tsc  # Should pass
rg "resources/types" --type ts  # Should return nothing
```

---

### 3. coreMocks Deprecated Functions

**Priority:** 🟢 Low | **Effort:** 30min | **Risk:** Test-only

#### Status
- **Affected files:** 13 test files
- **File:** `packages/core/src/utils/__tests__/setup/coreMocks.ts`

#### What to do

Global find/replace in test files:

```typescript
// Pattern 1:
mockRuntimeConstantsForFlow()
→
configMocks.mockCoreConfig()

// Pattern 2:
mockRuntimeConstantsForGP()
→
configMocks.mockCoreConfig({ evolution: { mode: 'gp' } })

// Pattern 3:
mockRuntimeConstants()
→
configMocks.mockCoreConfig()
```

After migration, remove from `coreMocks.ts`:
- `mockRuntimeConstantsForFlow`
- `mockRuntimeConstantsForGP`
- `mockRuntimeConstantsForIterative`
- `mockRuntimeConstantsForDatabase`
- `mockRuntimeConstants`

#### Verification

```bash
bun run test  # All tests should pass
rg "mockRuntimeConstants" --type ts  # Should return nothing
```

---

### 4. AgentStepsLegacy → AgentSteps

**Priority:** 🟢 Low | **Effort:** 30min | **Risk:** Low (UI-only)

#### Status
- **Affected files:** 2 (both in `apps/web` trace visualization)
- **Files:**
  - `apps/web/src/features/trace-visualization/components/TimelineEntry.tsx`
  - `apps/web/src/features/trace-visualization/db/Workflow/fullWorkflow.ts`

#### What to do

```typescript
// BEFORE:
import { type AgentStepsLegacy } from "@lucky/core/messages/pipeline/AgentStep.types"
interface Props {
  steps: AgentStepsLegacy
}

// AFTER:
import { type AgentSteps } from "@lucky/core/messages/pipeline/AgentStep.types"
interface Props {
  steps: AgentSteps
}
```

Remove type export from `packages/core/src/messages/pipeline/AgentStep.types.ts`.

#### Verification

```bash
bun run tsc
cd apps/web && bun run dev  # Check trace visualization still renders
```

---

### 5. LegacyToolUsage → AgentSteps

**Priority:** 🟢 Low | **Effort:** 30min | **Risk:** Low (UI-only)

#### Status
- **Affected files:** 1 (`TimelineEntry.tsx`)
- **Related to:** AgentStepsLegacy migration (do together)

#### What to do

Same as AgentStepsLegacy migration. If old database records exist, add adapter:

```typescript
function normalizeSteps(data: unknown): AgentSteps {
  if (isLegacyToolUsage(data)) {
    return convertLegacyToAgentSteps(data)
  }
  return data as AgentSteps
}
```

---

### 6. PROVIDER_CONFIGS → getProviderConfigs()

**Priority:** 🟡 Medium | **Effort:** 1h | **Risk:** Dynamic config

#### Status
- **Import locations:** 2 files
- **Usage locations:** 7 places
- **Files:**
  - `apps/web/src/components/providers/provider-config-page.tsx`
  - `apps/web/src/app/(protected)/settings/providers/page.tsx`
  - Internal use in `provider-utils.ts`

#### Why migrate?

```typescript
// ❌ OLD: Evaluated once at module load
export const PROVIDER_CONFIGS = getProviderConfigs()

// ✅ NEW: Dynamic, responds to config changes
const configs = getProviderConfigs()
```

**Problem:** Static export breaks hot-reload and runtime config changes.

#### What to do

```typescript
// BEFORE:
import { PROVIDER_CONFIGS } from "@/lib/providers/provider-utils"
const config = PROVIDER_CONFIGS[provider]

// AFTER:
import { getProviderConfigs } from "@/lib/providers/provider-utils"
const config = getProviderConfigs()[provider]
```

Repeat for all 7 usage locations. Remove static export from `provider-utils.ts`.

#### Verification

```bash
cd apps/web && bun run dev
# Test: Navigate to Settings → Providers
# Verify: All providers display correctly
bun run tsc
```

---

### 7. supabase Proxy → getSupabase()

**Priority:** 🟡 Medium | **Effort:** 2h | **Risk:** DB access patterns

#### Status
- **Affected files:** 9 (6 tests, 3 scripts)
- **File:** `packages/core/src/clients/supabase/client.ts`

#### Why migrate?

```typescript
// ❌ OLD: Proxy throws at runtime
import { supabase } from "@core/clients/supabase/client"
const { data } = await supabase.from('table').select() // Runtime error if unconfigured!

// ✅ NEW: Explicit, type-safe error handling
import { getSupabase } from "@core/clients/supabase/client"
const client = await getSupabase()
const { data } = await client.from('table').select()
```

**Problems:** Proxy hides errors, breaks tree-shaking, hard to mock.

#### What to do

**Pattern:**

```typescript
// BEFORE:
import { supabase } from "@core/clients/supabase/client"
async function doSomething() {
  const result = await supabase.from('workflows').select()
}

// AFTER:
import { getSupabase } from "@core/clients/supabase/client"
async function doSomething() {
  const supabase = await getSupabase()
  const result = await supabase.from('workflows').select()
}
```

**Test mocking:**

```typescript
// BEFORE:
vi.mock("@core/clients/supabase/client", () => ({
  supabase: mockClient
}))

// AFTER:
vi.mock("@core/clients/supabase/client", () => ({
  getSupabase: vi.fn(async () => mockClient)
}))
```

#### Verification

```bash
bun run test  # All tests pass
USE_MOCK_PERSISTENCE=true bun -C packages/core run once  # Still works
```

---

### 8. Mutations Class → MutationCoordinator

**Priority:** 🔴 High | **Effort:** 2h | **Risk:** GP evolution

#### Status
- **Affected files:** 3
  - `packages/core/src/improvement/gp/Genome.ts`
  - `packages/core/src/improvement/gp/Select.ts`
  - `packages/core/src/improvement/gp/__tests__/Mutations.test.ts`

#### Why migrate?

```typescript
// ❌ OLD: Mixed terminology
mutations.mutateWorkflowGenome({ aggression: 0.5 })

// ✅ NEW: Clear intent
MutationCoordinator.mutateWorkflowGenome({ intensity: 0.5 })
```

**Problem:** Inconsistent terminology, harder to extend.

#### What to do

**Update all 3 files:**

```typescript
// BEFORE:
import { Mutations } from "@core/improvement/gp/operators/Mutations"
await Mutations.mutateWorkflowGenome({ aggression: 0.8 })

// AFTER:
import { MutationCoordinator } from "@core/improvement/gp/operators/mutations/index"
await MutationCoordinator.mutateWorkflowGenome({ intensity: 0.8 })
```

**Remove legacy file:**

```bash
rm packages/core/src/improvement/gp/operators/Mutations.ts
```

#### Verification

```bash
bun run tsc
cd packages/core && bun run test:unit

# CRITICAL: Run GP evolution to verify unchanged behavior
USE_MOCK_PERSISTENCE=true bun -C packages/core run once --mode gp
```

---

### 9. getWorkflowInvocationId() → Safer Alternatives

**Priority:** 🔴 High | **Effort:** 3h | **Risk:** Invocation tracking

#### Status
- **Affected files:** 3 (`main.ts`, `NoEvaluator.ts`, `AggregatedEvaluator.ts`)

#### Why migrate?

```typescript
// ❌ UNSAFE: Only returns last invocation
workflow.getWorkflowInvocationId()

// ✅ SAFE: Explicit tracking
workflow.getLatestInvocationId()  // Clear intent
workflow.getAllInvocationIds()    // All IDs
workflow.getInvocationId(index)   // Specific ID
```

**Problem:** Misleading name, breaks with parallel executions.

#### What to do

**Step 1: Add new methods to `Workflow.ts`**

```typescript
getAllInvocationIds(): string[] {
  return [...this.invocationIds]
}

getLatestInvocationId(): string | null {
  return this.invocationIds[this.invocationIds.length - 1] ?? null
}

getInvocationId(index: number): string {
  if (index < 0 || index >= this.invocationIds.length) {
    throw new Error(`Invalid invocation index: ${index}`)
  }
  return this.invocationIds[index]
}
```

**Step 2: Update consumers**

```typescript
// main.ts:
workflowInvocationId: runner.getInvocationId(0)

// NoEvaluator.ts, AggregatedEvaluator.ts:
workflowLink: workflow.getLink(workflow.getLatestInvocationId() ?? '')
```

**Step 3: Remove deprecated method**

After migration, delete `getWorkflowInvocationId()` from `Workflow.ts`.

#### Verification

```bash
bun run tsc
cd packages/core && bun run test:unit

# Test multiple invocations manually
```

---

## Testing Checklist

Before removing deprecated code:

- [ ] TypeScript errors resolved (`bun run tsc`)
- [ ] Unit tests pass (`bun run test`)
- [ ] Smoke tests pass (`bun run test:smoke`)
- [ ] Gate tests pass (`bun run test:gate`)
- [ ] Manual testing of affected features
- [ ] Code formatted (`bun run format`)

---

## General Principles

1. **Type Safety First** - Use TypeScript to catch errors at compile time
2. **Incremental Migration** - One file at a time, keep tests passing
3. **Backward Compatibility** - Add new before removing old
4. **Document Changes** - Update comments, git commits, examples

---

## Progress Tracking

### Completed ✅
None yet

### In Progress 🔄
All 9 pending

### Blocked 🚫
None

---

**Remember:** The goal is maintainability. Take time, test thoroughly, document clearly.

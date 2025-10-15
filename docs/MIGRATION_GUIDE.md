# Migration Guide: Deprecated Code Patterns

**Last Updated:** 2025-10-16
**Status:** 6 deprecated items removed, 9 categories remain in active use

This guide provides comprehensive migration strategies for all remaining deprecated code in the Lucky codebase. Each section includes rationale, migration steps, testing strategies, and rollout guidance.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Migration Principles](#migration-principles)
3. [Detailed Migration Guides](#detailed-migration-guides)
   - [PROVIDER_CONFIGS → getProviderConfigs()](#1-provider_configs--getproviderconfigs)
   - [Mutations Class → MutationCoordinator](#2-mutations-class--mutationcoordinator)
   - [AgentStepsLegacy → AgentSteps](#3-agentstepslegacy--agentsteps)
   - [getWorkflowInvocationId() → Safer Alternatives](#4-getworkflowinvocationid--safer-alternatives)
   - [coreMocks Deprecated Functions](#5-coremocks-deprecated-functions)
   - [supabase Proxy → getSupabase()](#6-supabase-proxy--getsupabase)
   - [calculateCost() → calculateCostV2()](#7-calculatecost--calculatecostv2)
   - [LegacyToolUsage → AgentSteps](#8-legacytoolusage--agentsteps)
   - [gp/resources/types.ts Re-export](#9-gpresourcestypests-re-export)
4. [Testing Strategy](#testing-strategy)
5. [Rollout Process](#rollout-process)
6. [Validation Checklist](#validation-checklist)

---

## Quick Reference

| Deprecated Item | Replacement | Priority | Active Imports | Complexity |
|----------------|-------------|----------|----------------|------------|
| `PROVIDER_CONFIGS` | `getProviderConfigs()` | Medium | 2 | Low |
| `Mutations` class | `MutationCoordinator` | High | 3 | Medium |
| `AgentStepsLegacy` | `AgentSteps` | Low | 2 | Low |
| `getWorkflowInvocationId()` | Multiple IDs per workflow | High | 3 | High |
| coreMocks functions | Direct `configMocks` | Low | 13 tests | Low |
| `supabase` proxy | `getSupabase()` | Medium | 9 | Medium |
| `calculateCost()` | `calculateCostV2()` | Low | Active wrapper | Low |
| `LegacyToolUsage` | `AgentSteps` | Low | 1 | Medium |
| `gp/resources/types.ts` | Direct import from `gp.types.ts` | Low | 12 | Low |

---

## Migration Principles

### 1. **Type Safety First**
- Leverage TypeScript's type system to catch migration errors at compile time
- Use discriminated unions and strict null checks
- Prefer runtime validation (Zod) for external data boundaries

### 2. **Backward Compatibility During Transition**
- Keep deprecated code functional during migration period
- Use adapters/wrappers to bridge old and new patterns
- Add deprecation warnings in development mode

### 3. **Incremental Migration**
- Migrate one consumer at a time
- Use feature flags for risky changes
- Maintain parallel implementations during transition

### 4. **Test Coverage**
- Write tests for new implementation before migration
- Keep existing tests passing during migration
- Add integration tests for backward compatibility

### 5. **Documentation**
- Update inline comments and JSDoc
- Document breaking changes in CHANGELOG
- Provide migration examples in code

---

## Detailed Migration Guides

### 1. PROVIDER_CONFIGS → getProviderConfigs()

**Status:** 2 active imports in `apps/web`
**Priority:** Medium
**Complexity:** Low

#### Why Migrate?

```typescript
// ❌ OLD: Static export breaks with dynamic provider detection
export const PROVIDER_CONFIGS = getProviderConfigs()

// ✅ NEW: Dynamic function call respects runtime configuration
const configs = getProviderConfigs()
```

**Problems with old approach:**
- Static export evaluated at module load time
- Cannot respond to configuration changes
- Breaks hot module replacement in development
- Fails when environment variables change at runtime

#### Migration Steps

**File:** `apps/web/src/components/providers/provider-config-page.tsx`

```typescript
// BEFORE
import { PROVIDER_CONFIGS, testConnection, validateApiKey } from "@/lib/providers/provider-utils"

function Component() {
  const configs = PROVIDER_CONFIGS // Static reference
  // ...
}

// AFTER
import { getProviderConfigs, testConnection, validateApiKey } from "@/lib/providers/provider-utils"

function Component() {
  const configs = getProviderConfigs() // Dynamic call
  // ...
}
```

**File:** `apps/web/src/app/(protected)/settings/providers/page.tsx`

```typescript
// BEFORE
import { PROVIDER_CONFIGS, getEnabledProviderSlugs } from "@/lib/providers/provider-utils"

export default function ProvidersPage() {
  const providers = PROVIDER_CONFIGS
  // ...
}

// AFTER
import { getProviderConfigs, getEnabledProviderSlugs } from "@/lib/providers/provider-utils"

export default function ProvidersPage() {
  const providers = getProviderConfigs()
  // ...
}
```

#### Testing Strategy

1. **Unit Tests:**
```typescript
describe('getProviderConfigs', () => {
  it('returns dynamic configuration', () => {
    const config1 = getProviderConfigs()
    process.env.NEW_PROVIDER = 'enabled'
    const config2 = getProviderConfigs()
    expect(config1).not.toEqual(config2) // Should differ
  })
})
```

2. **Integration Tests:**
- Verify provider selection UI works correctly
- Test environment variable hot-reload
- Check settings page renders all providers

3. **Manual Testing:**
- Toggle provider availability flags
- Verify UI updates without page reload
- Test with missing API keys

#### Rollout

1. Create feature flag: `USE_DYNAMIC_PROVIDER_CONFIGS`
2. Deploy with feature flag disabled
3. Enable for internal testing
4. Monitor logs for errors
5. Enable for all users
6. Remove static export in next release

---

### 2. Mutations Class → MutationCoordinator

**Status:** 3 active imports (Genome.ts, Select.ts, tests)
**Priority:** High
**Complexity:** Medium

#### Why Migrate?

```typescript
// ❌ OLD: Class-based with unclear ownership
const mutations = new Mutations()
mutations.mutateWorkflowGenome(genome, { aggression: 0.5 })

// ✅ NEW: Functional coordinator with clear intent
const coordinator = new MutationCoordinator()
coordinator.mutateWorkflowGenome(genome, { intensity: 0.5 })
```

**Problems with old approach:**
- Mixed terminology (`aggression` vs `intensity`)
- Stateful class design complicates testing
- No clear separation of concerns
- Difficult to extend with new mutation strategies

#### Migration Steps

**Phase 1: Update Test Files**

```typescript
// packages/core/src/improvement/gp/__tests__/Mutations.test.ts
// BEFORE
import { Mutations } from "@core/improvement/gp/operators/Mutations"
const mutations = new Mutations()
const mutated = await mutations.mutateWorkflowGenome(genome, { aggression: 0.8 })

// AFTER
import { MutationCoordinator } from "@core/improvement/gp/operators/mutations/index"
const coordinator = new MutationCoordinator()
const mutated = await coordinator.mutateWorkflowGenome(genome, { intensity: 0.8 })
```

**Phase 2: Update Genome.ts**

```typescript
// packages/core/src/improvement/gp/Genome.ts
// BEFORE
import { Mutations } from "@core/improvement/gp/operators/Mutations"
const mutations = new Mutations()

async mutate(options: MutationOptions): Promise<Genome> {
  const mutated = await mutations.mutateWorkflowGenome(
    this.workflowGenome,
    { aggression: options.aggression ?? 0.5 }
  )
  return new Genome(mutated, this.populationId)
}

// AFTER
import { MutationCoordinator } from "@core/improvement/gp/operators/mutations/index"
const coordinator = new MutationCoordinator()

async mutate(options: MutationOptions): Promise<Genome> {
  const mutated = await coordinator.mutateWorkflowGenome(
    this.workflowGenome,
    { intensity: options.intensity ?? 0.5 }
  )
  return new Genome(mutated, this.populationId)
}
```

**Phase 3: Update Select.ts**

```typescript
// packages/core/src/improvement/gp/Select.ts
// BEFORE
import { Mutations } from "@core/improvement/gp/operators/Mutations"

// AFTER
import { MutationCoordinator } from "@core/improvement/gp/operators/mutations/index"
```

**Phase 4: Remove Legacy File**

After all imports are migrated:
```bash
rm packages/core/src/improvement/gp/operators/Mutations.ts
```

#### Testing Strategy

1. **Unit Tests:**
```typescript
describe('MutationCoordinator', () => {
  it('produces equivalent results to Mutations class', async () => {
    const genome = createTestGenome()

    // Test old implementation
    const oldMutations = new Mutations()
    const oldResult = await oldMutations.mutateWorkflowGenome(genome, { aggression: 0.5 })

    // Test new implementation
    const coordinator = new MutationCoordinator()
    const newResult = await coordinator.mutateWorkflowGenome(genome, { intensity: 0.5 })

    // Should produce statistically similar mutations
    expect(newResult.nodes.length).toBe(oldResult.nodes.length)
  })
})
```

2. **Integration Tests:**
- Run full GP evolution with new coordinator
- Compare fitness scores before/after migration
- Verify golden traces still match

3. **Regression Tests:**
- Keep existing Mutations.test.ts passing during migration
- Only remove once all consumers migrated

#### Rollout

1. Add deprecation warning to `Mutations` class constructor
2. Migrate tests first (lowest risk)
3. Migrate production code (Genome.ts, Select.ts)
4. Run GP evolution comparison study:
   - 10 runs with old implementation
   - 10 runs with new implementation
   - Compare convergence rates and final fitness
5. If metrics match, remove legacy file

---

### 3. AgentStepsLegacy → AgentSteps

**Status:** 2 active imports in trace visualization
**Priority:** Low
**Complexity:** Low

#### Why Migrate?

```typescript
// ❌ OLD: Legacy format with inconsistent structure
interface AgentStepsLegacy {
  outputs: LegacyToolUsageStep[]
  totalCost?: number
}

// ✅ NEW: Unified AgentSteps format
type AgentSteps = AgentStep[]
```

**Problems with old approach:**
- Separate cost tracking (should be in metadata)
- `outputs` naming doesn't match domain
- Mixed step formats require normalization

#### Migration Steps

**File:** `apps/web/src/features/trace-visualization/components/TimelineEntry.tsx`

```typescript
// BEFORE
import { type AgentStepsLegacy } from "@lucky/core/messages/pipeline/AgentStep.types"

interface Props {
  steps: AgentStepsLegacy
}

// AFTER
import { type AgentSteps } from "@lucky/core/messages/pipeline/AgentStep.types"

interface Props {
  steps: AgentSteps
}
```

**File:** `apps/web/src/features/trace-visualization/db/Workflow/fullWorkflow.ts`

```typescript
// BEFORE
function normalizeSteps(data: unknown): AgentStepsLegacy {
  // Normalization logic
}

// AFTER
function normalizeSteps(data: unknown): AgentSteps {
  // Direct conversion
}
```

#### Testing Strategy

1. **Visual Regression Tests:**
```typescript
describe('TimelineEntry', () => {
  it('renders AgentSteps correctly', () => {
    const steps: AgentSteps = [
      { type: 'tool', name: 'search', args: {}, return: 'results' },
      { type: 'text', return: 'Done' }
    ]
    render(<TimelineEntry steps={steps} />)
    expect(screen.getByText('search')).toBeInTheDocument()
  })
})
```

2. **Database Migration:**
- Ensure old traces in DB still render correctly
- Add adapter if needed: `LegacyToolUsage → AgentSteps`

#### Rollout

1. Update database query to return `AgentSteps` format
2. Update React components to consume `AgentSteps`
3. Remove `AgentStepsLegacy` type export

---

### 4. getWorkflowInvocationId() → Safer Alternatives

**Status:** 3 active imports (main.ts, evaluators)
**Priority:** High
**Complexity:** High

#### Why Migrate?

```typescript
// ❌ UNSAFE: Returns only last invocation
workflow.getWorkflowInvocationId()
// Returns: "abc123" (but which invocation?)

// ✅ SAFE: Explicit invocation tracking
workflow.getAllInvocationIds()
// Returns: ["abc123", "def456", "ghi789"]

workflow.getInvocationId(index: number)
// Returns: "abc123" with clear intent
```

**Problems with old approach:**
- Only returns the **last** invocation ID
- Breaks when workflow has multiple invocations
- Unsafe for parallel workflow execution
- No way to retrieve historical invocations

#### Migration Steps

**Strategy A: Track All Invocations**

```typescript
// packages/core/src/workflow/Workflow.ts
class Workflow {
  private invocationIds: string[] = []

  /**
   * Get all invocation IDs for this workflow
   */
  getAllInvocationIds(): string[] {
    return [...this.invocationIds]
  }

  /**
   * Get specific invocation by index
   */
  getInvocationId(index: number): string {
    if (index < 0 || index >= this.invocationIds.length) {
      throw new Error(`Invalid invocation index: ${index}`)
    }
    return this.invocationIds[index]
  }

  /**
   * Get most recent invocation ID
   */
  getLatestInvocationId(): string | null {
    return this.invocationIds[this.invocationIds.length - 1] ?? null
  }
}
```

**Strategy B: Context-Based Invocation IDs**

```typescript
// Track invocation ID in execution context
interface ExecutionContext {
  workflowId: string
  invocationId: string
  timestamp: number
}

// Pass context through execution chain
async function executeWorkflow(workflow: Workflow): Promise<Result> {
  const invocationId = crypto.randomUUID()
  const context: ExecutionContext = {
    workflowId: workflow.id,
    invocationId,
    timestamp: Date.now()
  }

  return await workflow.execute(context)
}
```

**File:** `packages/core/src/main.ts`

```typescript
// BEFORE
workflowInvocationId: runner.getWorkflowInvocationId(0)

// AFTER (Option 1: Explicit index)
workflowInvocationId: runner.getInvocationId(0)

// AFTER (Option 2: Latest)
workflowInvocationId: runner.getLatestInvocationId() ?? 'unknown'

// AFTER (Option 3: All invocations)
workflowInvocationIds: runner.getAllInvocationIds()
```

**File:** `packages/core/src/evaluation/evaluators/NoEvaluator.ts`

```typescript
// BEFORE
workflowLink: workflow.getLink(workflow.getWorkflowInvocationId())

// AFTER
workflowLink: workflow.getLink(workflow.getLatestInvocationId() ?? '')
```

#### Testing Strategy

1. **Unit Tests:**
```typescript
describe('Workflow invocation tracking', () => {
  it('tracks multiple invocations', async () => {
    const workflow = new Workflow(config)

    await workflow.execute(input1)
    await workflow.execute(input2)
    await workflow.execute(input3)

    const ids = workflow.getAllInvocationIds()
    expect(ids).toHaveLength(3)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('throws on invalid index', () => {
    const workflow = new Workflow(config)
    expect(() => workflow.getInvocationId(0)).toThrow()
  })
})
```

2. **Integration Tests:**
- Test parallel workflow execution
- Verify invocation IDs are unique
- Check database persistence

#### Rollout

1. Add new methods alongside deprecated method
2. Add deprecation warning to `getWorkflowInvocationId()`
3. Migrate consumers one by one
4. Add runtime assertion in deprecated method:
   ```typescript
   if (this.invocationIds.length > 1) {
     console.warn('Multiple invocations detected. Use getAllInvocationIds() instead.')
   }
   ```
5. Remove deprecated method after full migration

---

### 5. coreMocks Deprecated Functions

**Status:** 13 test files
**Priority:** Low
**Complexity:** Low

#### Why Migrate?

```typescript
// ❌ OLD: Wrapper functions that do nothing
mockRuntimeConstantsForFlow()
mockRuntimeConstantsForGP()

// ✅ NEW: Direct usage
configMocks.mockCoreConfig()
```

**Problems with old approach:**
- No-op functions waste mental bandwidth
- Inconsistent naming conventions
- Difficult to discover what's actually being mocked

#### Migration Steps

**Global Find/Replace:**

```typescript
// Pattern 1
mockRuntimeConstantsForFlow()
→
configMocks.mockCoreConfig()

// Pattern 2
mockRuntimeConstantsForGP()
→
configMocks.mockCoreConfig({ evolution: { mode: 'gp' } })

// Pattern 3
mockRuntimeConstants()
→
configMocks.mockCoreConfig()
```

**Example Migration:**

```typescript
// BEFORE
import { mockRuntimeConstantsForFlow } from "@core/utils/__tests__/setup/coreMocks"

describe('MyTest', () => {
  beforeEach(() => {
    mockRuntimeConstantsForFlow()
  })
})

// AFTER
import { configMocks } from "@core/utils/__tests__/setup/coreMocks"

describe('MyTest', () => {
  beforeEach(() => {
    configMocks.mockCoreConfig()
  })
})
```

#### Testing Strategy

1. Run full test suite after each file migration
2. No behavior changes expected
3. Check for any undocumented side effects

#### Rollout

1. Migrate all 13 test files in single PR
2. Remove deprecated functions from coreMocks.ts
3. Run CI to verify all tests pass

---

### 6. supabase Proxy → getSupabase()

**Status:** 9 active imports
**Priority:** Medium
**Complexity:** Medium

#### Why Migrate?

```typescript
// ❌ OLD: Proxy throws at runtime if not configured
import { supabase } from "@core/clients/supabase/client"
const { data } = await supabase.from('table').select() // Runtime error!

// ✅ NEW: Explicit error handling
import { getSupabase } from "@core/clients/supabase/client"
const client = await getSupabase()
const { data } = await client.from('table').select()
```

**Problems with old approach:**
- Proxy hides initialization errors until first use
- No type-safe error handling
- Breaks tree-shaking (proxy always included)
- Difficult to mock in tests

#### Migration Steps

**Pattern:**

```typescript
// BEFORE
import { supabase } from "@core/clients/supabase/client"

async function doSomething() {
  const result = await supabase.from('workflows').select()
}

// AFTER
import { getSupabase } from "@core/clients/supabase/client"

async function doSomething() {
  const supabase = await getSupabase()
  const result = await supabase.from('workflows').select()
}
```

**Files to Migrate:**

1. `packages/core/src/workflow/ingestion/__tests__/ingestion-dataset-records.test.ts`
2. `packages/core/src/utils/persistence/memory/SupabaseStore.ts`
3. `packages/core/src/utils/cleanup/__tests__/cleanupStaleRecords.test.ts`
4. `packages/core/src/utils/__tests__/cleanup.ts`
5. `apps/web/scripts/backfill-evolution-type.ts`
6. `apps/web/scripts/export-trace.ts`
7. `apps/web/scripts/list-annotated-full-runs.ts`
8. `apps/web/scripts/list-runs-with-inputs.ts`
9. `apps/examples/definitions/run-inspector/tool.ts`

#### Testing Strategy

1. **Mock Strategy:**
```typescript
// BEFORE
vi.mock("@core/clients/supabase/client", () => ({
  supabase: mockClient
}))

// AFTER
vi.mock("@core/clients/supabase/client", () => ({
  getSupabase: vi.fn(async () => mockClient)
}))
```

2. **Integration Tests:**
- Test with missing credentials
- Test with mock persistence mode
- Verify error messages are helpful

#### Rollout

1. Add `USE_MOCK_PERSISTENCE` checks
2. Migrate tests first (6 files)
3. Migrate production code (3 files)
4. Remove proxy after 1 release cycle

---

### 7. calculateCost() → calculateCostV2()

**Status:** Active wrapper (no direct imports)
**Priority:** Low
**Complexity:** Low

#### Why Migrate?

```typescript
// ❌ OLD: Wrapper adds unnecessary indirection
function calculateCost(model: string, usage: TokenUsage): number {
  return calculateCostV2(model, usage) // Just forwards
}

// ✅ NEW: Direct usage
calculateCostV2(model, usage)
```

**Problems with old approach:**
- Extra function call overhead
- Confusing naming (why v2?)
- Prevents dead code elimination

#### Migration Steps

**Global Find/Replace:**

```bash
# Find all usage (should be 0 direct imports)
rg "calculateCost\(" --type ts

# If any found, replace with calculateCostV2
```

**Remove Deprecated Function:**

```typescript
// packages/core/src/messages/api/vercel/pricing/calculatePricing.ts
// DELETE THIS FUNCTION
export function calculateCost(model: string, usage: TokenUsage): number {
  return calculateCostV2(model, usage)
}
```

#### Testing Strategy

1. Run existing pricing tests
2. No behavior changes expected

#### Rollout

1. Verify no direct imports exist
2. Remove wrapper function
3. Done!

---

### 8. LegacyToolUsage → AgentSteps

**Status:** 1 active import (TimelineEntry.tsx)
**Priority:** Low
**Complexity:** Medium

#### Why Migrate?

```typescript
// ❌ OLD: Legacy format from old API
interface LegacyToolUsage {
  outputs: LegacyToolUsageStep[]
  totalCost?: number
}

// ✅ NEW: Unified format
type AgentSteps = AgentStep[]
```

**Problems with old approach:**
- Only needed for old database records
- Adds normalization overhead
- Inconsistent with current API

#### Migration Steps

**Option A: Database Migration**

```typescript
// Migrate old records to new format
async function migrateToolUsage() {
  const oldRecords = await supabase
    .from('node_invocations')
    .select('*')
    .contains('tool_usage', { outputs: [] })

  for (const record of oldRecords) {
    const legacy = record.tool_usage as LegacyToolUsage
    const normalized = normalizeLegacyToolUsage(legacy)

    await supabase
      .from('node_invocations')
      .update({ agent_steps: normalized.steps })
      .eq('id', record.id)
  }
}
```

**Option B: Adapter Pattern**

```typescript
// Keep adapter for backward compatibility
function loadAgentSteps(record: DbRecord): AgentSteps {
  if (isLegacyToolUsage(record.tool_usage)) {
    return normalizeLegacyToolUsage(record.tool_usage).steps
  }
  return record.agent_steps
}
```

#### Testing Strategy

1. Count legacy records in production DB
2. If < 100, run migration
3. If > 100, keep adapter permanently

#### Rollout

1. Run migration script on staging
2. Verify UI still works
3. Run on production
4. Remove legacy support after 1 month

---

### 9. gp/resources/types.ts Re-export

**Status:** 12 active imports
**Priority:** Low
**Complexity:** Low

#### Why Migrate?

```typescript
// ❌ OLD: Indirect import through re-export file
import { EvolutionContext } from "@core/improvement/gp/resources/types"

// ✅ NEW: Direct import from source
import { EvolutionContext } from "@core/improvement/gp/gp.types"
```

**Problems with old approach:**
- Extra file in dependency chain
- Harder to trace type origin
- Confuses auto-import tools

#### Migration Steps

**Global Find/Replace:**

```bash
# Find all imports
rg "from.*improvement/gp/resources/types" --type ts

# Replace pattern
from "@core/improvement/gp/resources/types"
→
from "@core/improvement/gp/gp.types"
```

**Remove Re-export File:**

```bash
rm packages/core/src/improvement/gp/resources/types.ts
```

#### Testing Strategy

1. Run TypeScript compiler
2. No runtime changes expected

#### Rollout

1. Update all 12 imports in single PR
2. Remove re-export file
3. Update import path in documentation

---

## Testing Strategy

### 1. Pre-Migration Testing

```typescript
// Create baseline tests
describe('Baseline: Before Migration', () => {
  it('captures current behavior', () => {
    const result = deprecatedFunction()
    expect(result).toMatchSnapshot()
  })
})
```

### 2. Parallel Testing

```typescript
// Run old and new implementations side-by-side
describe('Migration: Parallel Validation', () => {
  it('new implementation matches old', () => {
    const oldResult = deprecatedFunction()
    const newResult = modernFunction()
    expect(newResult).toEqual(oldResult)
  })
})
```

### 3. Golden Trace Validation

```bash
# Before migration
bun run test:gate
cp tests/e2e-essential/golden-trace.json golden-trace-before.json

# After migration
bun run test:gate
diff golden-trace-before.json tests/e2e-essential/golden-trace.json
```

### 4. Performance Testing

```typescript
describe('Performance: Migration Impact', () => {
  it('new implementation is not slower', () => {
    const oldTime = measureTime(() => deprecatedFunction())
    const newTime = measureTime(() => modernFunction())
    expect(newTime).toBeLessThanOrEqual(oldTime * 1.1) // 10% margin
  })
})
```

---

## Rollout Process

### Phase 1: Preparation (Week 1)

1. **Create migration branch**
   ```bash
   git checkout -b migrate/deprecated-code
   ```

2. **Add deprecation warnings**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     console.warn('⚠️  Using deprecated API. Migrate to X instead.')
   }
   ```

3. **Document current usage**
   ```bash
   rg "@deprecated" > docs/deprecated-inventory.txt
   ```

### Phase 2: Low-Risk Migrations (Week 2)

Priority order:
1. Test-only code (coreMocks, test utilities)
2. Wrapper functions (calculateCost)
3. Re-exports (gp/resources/types.ts)

### Phase 3: Medium-Risk Migrations (Week 3-4)

Priority order:
1. UI components (PROVIDER_CONFIGS, AgentStepsLegacy)
2. Database clients (supabase proxy)
3. Type definitions (LegacyToolUsage)

### Phase 4: High-Risk Migrations (Week 5-6)

Priority order:
1. Core algorithms (Mutations → MutationCoordinator)
2. Workflow execution (getWorkflowInvocationId)

### Phase 5: Cleanup (Week 7)

1. Remove deprecated code
2. Update documentation
3. Run full regression suite
4. Deploy to production

---

## Validation Checklist

### Pre-Deployment

- [ ] All TypeScript errors resolved
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Golden traces match (or differences documented)
- [ ] Performance benchmarks within acceptable range
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] No console warnings in development mode

### Post-Deployment

- [ ] Monitor error rates for 24 hours
- [ ] Check performance metrics
- [ ] Verify no regression reports
- [ ] Confirm database queries still efficient
- [ ] Review Sentry/logging for unexpected errors

### Final Cleanup (After 1 Release)

- [ ] Remove deprecated code
- [ ] Remove feature flags
- [ ] Remove adapter code
- [ ] Archive migration guide
- [ ] Celebrate! 🎉

---

## Common Pitfalls

### 1. Breaking Backward Compatibility

**Problem:** Removing deprecated code too quickly

**Solution:**
- Keep deprecated code for at least 1 major version
- Add runtime warnings before removal
- Provide clear migration path in error messages

### 2. Incomplete Migration

**Problem:** Missing edge cases or less-used code paths

**Solution:**
```typescript
// Add runtime detection
if (isUsingDeprecatedAPI()) {
  logger.error('Deprecated API still in use', {
    caller: new Error().stack,
    context
  })
}
```

### 3. Test Coverage Gaps

**Problem:** Tests pass but production breaks

**Solution:**
- Test with production-like data
- Use feature flags to test in production
- Monitor error rates closely

### 4. Performance Regressions

**Problem:** New code is slower than old code

**Solution:**
- Profile before and after migration
- Use React DevTools Profiler
- Check database query performance

---

## Migration Metrics

Track these metrics for each migration:

```typescript
interface MigrationMetrics {
  linesChanged: number
  filesModified: number
  testsAdded: number
  regressionBugs: number
  rollbacksRequired: number
  deploymentTime: Date
  stableAfter: Date
}
```

**Success Criteria:**
- Zero regression bugs after 1 week
- < 5% performance impact
- All tests passing
- No rollbacks required

---

## Questions?

For migration assistance:
1. Check this guide first
2. Search existing issues/PRs
3. Ask in team chat
4. Create tracking issue

---

**Remember:** The goal is not just to remove deprecated code, but to make the codebase more maintainable, type-safe, and easier to understand. Take your time, test thoroughly, and document changes clearly.

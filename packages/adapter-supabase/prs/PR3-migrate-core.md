# PR3: Migrate @lucky/core to PersistencePort (Remove Supabase Types)

**Status:** Not Started
**Estimated Effort:** 6-8 hours
**Risk:** Medium (changes call sites, but TypeScript guides migration)
**Depends On:** PR2

---

## Objective

Replace all uses of `IPersistence` with `PersistencePort` in @lucky/core. Remove all imports of Supabase types. Translate snake_case database field references to camelCase domain fields.

---

## Migration Strategy

Work module-by-module, guided by TypeScript errors. Each commit migrates one module.

---

## Changes by Module

### 1. **Workflow Module** (`packages/core/src/workflow/`)

**Files to update:**
- `Workflow.ts:362` - Replace `createWorkflowInvocation`
- `runner/invokeWorkflow.ts:205` - Replace `createWorkflowInvocation`
- `runner/invokeWorkflow.ts:398` - Replace `updateWorkflowInvocation`
- `runner/queueRun.ts:373` - Replace node invocation calls

**Before:**
```typescript
await persistence.createWorkflowInvocation({
  wf_invocation_id: id,
  wf_version_id: versionId,
  status: 'running',
  start_time: new Date().toISOString(),
  usd_cost: 0,
  workflow_input: input,
})
```

**After:**
```typescript
await port.invocations.start({
  invocationId: id,
  versionId,
  input,
  clerkId,
})
```

**Before:**
```typescript
await persistence.updateWorkflowInvocation({
  wf_invocation_id: id,
  status: 'completed',
  end_time: new Date().toISOString(),
  workflow_output: output,
  usd_cost: totalCost,
})
```

**After:**
```typescript
await port.invocations.complete({
  invocationId: id,
  status: 'completed',
  endedAt: new Date(),
  output,
  usdCost: totalCost,
})
```

### 2. **Evolution Module** (`packages/core/src/improvement/gp/`)

**Files to update:**
- `Genome.ts:120` - Replace `createWorkflowVersion`
- `RunService.ts:85` - Replace `createGeneration`
- `RunService.ts:200` - Replace `completeGeneration`

**Before:**
```typescript
await persistence.createWorkflowVersion({
  wf_version_id: genomeId,
  workflow_id: workflowId,
  dsl: config,
  operation: 'mutation',
  commit_message: `Mutated genome ${genomeId}`,
  generation_id: generationId,
})
```

**After:**
```typescript
await port.versions.create({
  versionId: genomeId,
  workflowId,
  dsl: config,
  operation: 'mutation',
  commitMessage: `Mutated genome ${genomeId}`,
  generationId,
  clerkId,
})
```

### 3. **Node Module** (`packages/core/src/node/`)

**Files to update:**
- `invocation/executeNode.ts:150` - Node invocation start
- `responseHandler.ts:165` - Node invocation end

Migrate to port.nodes namespace when added in PR2.

### 4. **Messages Module** (`packages/core/src/messages/`)

**Files to update:**
- `pipeline/MessageQueue.ts:87` - Message saving

Migrate to port.messages namespace when added in PR2.

### 5. **Update Type Imports**

Replace across all files:

**Before:**
```typescript
import type { Tables, TablesInsert, TablesUpdate } from "@lucky/shared"
```

**After:**
```typescript
import type {
  WorkflowVersion,
  WorkflowInvocation,
  CreateWorkflowVersionCmd,
  StartWorkflowInvocationCmd,
} from "@lucky/shared/contracts"
```

### 6. **Update Persistence Initialization**

In `packages/core/src/core/main.ts`:

**Before:**
```typescript
import { createPersistence } from "@together/adapter-supabase"
export const persistence = createPersistence({ ... })
```

**After:**
```typescript
import { SupabasePersistencePort } from "@together/adapter-supabase"
import { getSupabaseClient } from "@together/adapter-supabase/client"

export const port = new SupabasePersistencePort(getSupabaseClient())
```

---

## Field Name Translation Reference

| Database (snake_case) | Domain (camelCase) |
|---|---|
| wf_invocation_id | invocationId |
| wf_version_id | versionId |
| workflow_id | workflowId |
| generation_id | generationId |
| run_id | runId |
| start_time | startedAt |
| end_time | endedAt |
| usd_cost | usdCost |
| workflow_input | input |
| workflow_output | output |
| commit_message | commitMessage |

---

## Testing After Each Module Migration

```bash
# After migrating each module, verify:
cd packages/core
npm run tsc          # No new errors
npm run test         # All tests pass
```

---

## Rollback Plan

If migration causes issues:
1. Each module is in separate commit
2. Revert commits for problematic modules
3. Fix issues, recommit
4. Continue migration

---

## Verification Checklist

- [ ] Workflow module migrated (Workflow.ts, invokeWorkflow.ts, queueRun.ts)
- [ ] Evolution module migrated (Genome.ts, RunService.ts)
- [ ] Node module migrated (executeNode.ts, responseHandler.ts)
- [ ] Messages module migrated (MessageQueue.ts)
- [ ] All snake_case field names replaced with camelCase
- [ ] All imports of `Tables*` removed from @lucky/core
- [ ] ESLint rule passes (no Supabase type imports)
- [ ] `tsc` compiles with 0 errors
- [ ] All tests pass
- [ ] Workflow execution works end-to-end
- [ ] Evolution run works end-to-end

---

## Next PR

PR4 will remove the old `IPersistence` interface and make `PersistencePort` the only public API.

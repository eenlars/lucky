# PR2: Implement PersistencePort in Adapter (Parallel to Existing API)

**Status:** Not Started
**Estimated Effort:** 4-6 hours
**Risk:** Low (parallel implementation, no core changes)
**Depends On:** PR1

---

## Objective

Implement `PersistencePort` in both SupabasePersistence and InMemoryPersistence. Keep existing `IPersistence` interface working. This allows incremental migration without breaking existing code.

---

## What Changes

### 1. Create Mapper Functions in `packages/adapter-supabase/src/mappers/`

**`mappers/workflow-version.ts`:**

```typescript
import type { TablesInsert, Tables } from "@lucky/shared"
import type { CreateWorkflowVersionCmd, WorkflowVersion } from "@lucky/shared/contracts"

export function toWorkflowVersionRow(cmd: CreateWorkflowVersionCmd): TablesInsert<"WorkflowVersion"> {
  return {
    wf_version_id: cmd.versionId,
    workflow_id: cmd.workflowId,
    dsl: cmd.dsl,
    commit_message: cmd.commitMessage,
    operation: cmd.operation,
    generation_id: cmd.generationId ?? null,
    parent1_id: cmd.parents?.parent1Id ?? null,
    parent2_id: cmd.parents?.parent2Id ?? null,
    clerk_id: cmd.clerkId ?? null,
    input_schema: {},
    iteration_budget: 10,
    time_budget_seconds: 3600,
  }
}

export function fromWorkflowVersionRow(row: Tables<"WorkflowVersion">): WorkflowVersion {
  return {
    id: row.wf_version_id as WorkflowVersionId,
    workflowId: row.workflow_id as WorkflowId,
    dsl: row.dsl,
    operation: row.operation,
    commitMessage: row.commit_message,
    generationId: row.generation_id as GenerationId | undefined,
    parents: {
      parent1Id: row.parent1_id as WorkflowVersionId | undefined,
      parent2Id: row.parent2_id as WorkflowVersionId | undefined,
    },
    createdAt: row.created_at,
  }
}
```

**`mappers/workflow-invocation.ts`:**

```typescript
export function toWorkflowInvocationRow(cmd: StartWorkflowInvocationCmd): TablesInsert<"WorkflowInvocation"> {
  return {
    wf_invocation_id: cmd.invocationId,
    wf_version_id: cmd.versionId,
    status: 'running',
    start_time: new Date().toISOString(),
    usd_cost: 0,
    end_time: null,
    workflow_input: cmd.input ?? null,
    run_id: cmd.run?.runId ?? null,
    generation_id: cmd.run?.generationId ?? null,
    clerk_id: cmd.clerkId ?? null,
  }
}

export function fromWorkflowInvocationRow(row: Tables<"WorkflowInvocation">): WorkflowInvocation {
  return {
    id: row.wf_invocation_id as WorkflowInvocationId,
    versionId: row.wf_version_id as WorkflowVersionId,
    status: row.status,
    startedAt: row.start_time,
    endedAt: row.end_time ?? undefined,
    usdCost: row.usd_cost,
    input: row.workflow_input,
    output: row.workflow_output,
    run: row.run_id ? { runId: row.run_id as RunId, generationId: row.generation_id as GenerationId } : undefined,
    fitness: row.fitness,
  }
}

export function toWorkflowInvocationPatch(patch: CompleteWorkflowInvocationPatch): TablesUpdate<"WorkflowInvocation"> {
  return {
    wf_invocation_id: patch.invocationId,
    status: patch.status,
    end_time: patch.endedAt?.toISOString() ?? new Date().toISOString(),
    workflow_output: patch.output ?? null,
    usd_cost: patch.usdCost,
    fitness: patch.fitness ?? null,
  }
}
```

### 2. Implement `SupabasePersistencePort` in `packages/adapter-supabase/src/supabase-port.ts`

```typescript
import type { PersistencePort } from "@lucky/shared/contracts"
import { fromWorkflowVersionRow, toWorkflowVersionRow } from "./mappers/workflow-version"
import { fromWorkflowInvocationRow, toWorkflowInvocationRow, toWorkflowInvocationPatch } from "./mappers/workflow-invocation"

export class SupabasePersistencePort implements PersistencePort {
  constructor(private client: SupabaseClient) {}

  workflows = {
    ensure: async (workflow) => {
      const { error } = await this.client
        .from("Workflow")
        .upsert({ wf_id: workflow.id, description: workflow.description, clerk_id: workflow.clerkId ?? null })

      if (error) throw new PersistenceError(`Failed to ensure workflow: ${error.message}`)
    }
  }

  versions = {
    create: async (cmd) => {
      const row = toWorkflowVersionRow(cmd)
      const { data, error } = await this.client
        .from("WorkflowVersion")
        .insert(row)
        .select()
        .single()

      if (error) throw new PersistenceError(`Failed to create workflow version: ${error.message}`)
      return fromWorkflowVersionRow(data)
    },

    getById: async (id) => {
      const { data, error } = await this.client
        .from("WorkflowVersion")
        .select()
        .eq("wf_version_id", id)
        .maybeSingle()

      if (error) throw new PersistenceError(`Failed to get workflow version: ${error.message}`)
      return data ? fromWorkflowVersionRow(data) : null
    }
  }

  invocations = {
    start: async (cmd) => {
      const row = toWorkflowInvocationRow(cmd)
      const { data, error } = await this.client
        .from("WorkflowInvocation")
        .insert(row)
        .select()
        .single()

      if (error) throw new PersistenceError(`Failed to start invocation: ${error.message}`)
      return fromWorkflowInvocationRow(data)
    },

    complete: async (patch) => {
      const update = toWorkflowInvocationPatch(patch)
      const { data, error } = await this.client
        .from("WorkflowInvocation")
        .update(update)
        .eq("wf_invocation_id", patch.invocationId)
        .select()
        .single()

      if (error) throw new PersistenceError(`Failed to complete invocation: ${error.message}`)
      return fromWorkflowInvocationRow(data)
    },

    getById: async (id) => {
      const { data, error } = await this.client
        .from("WorkflowInvocation")
        .select()
        .eq("wf_invocation_id", id)
        .maybeSingle()

      if (error) throw new PersistenceError(`Failed to get invocation: ${error.message}`)
      return data ? fromWorkflowInvocationRow(data) : null
    }
  }

  withTransaction = async <T>(fn: (tx: PersistencePort) => Promise<T>): Promise<T> => {
    // Supabase doesn't expose transactions directly, single connection handles atomicity
    // For now, just execute the function
    return fn(this)
  }
}
```

### 3. Implement `InMemoryPersistencePort` in `packages/adapter-supabase/src/memory-port.ts`

Mirror the same interface, store in Maps, apply same defaults.

### 4. Export from Adapter Index

In `packages/adapter-supabase/src/index.ts`:

```typescript
export { SupabasePersistencePort } from "./supabase-port"
export { InMemoryPersistencePort } from "./memory-port"
```

---

## What Does NOT Change

- Existing `IPersistence` interface still exported
- Existing `SupabasePersistence` class still works
- No changes to @lucky/core call sites
- Tests continue to use old interface

---

## Testing

```bash
# Create new test file
packages/adapter-supabase/src/__tests__/port-contract.test.ts

# Test both implementations against same contract
describe("PersistencePort Contract", () => {
  [SupabasePersistencePort, InMemoryPersistencePort].forEach(Port => {
    it(`${Port.name} creates workflow version`, async () => {
      const port = new Port(...)
      const version = await port.versions.create({
        workflowId: "wf_123",
        dsl: {},
        operation: "init",
        commitMessage: "Initial version"
      })
      expect(version.id).toBeDefined()
      expect(version.workflowId).toBe("wf_123")
    })
  })
})
```

---

## Verification Checklist

- [ ] Mapper functions created in `mappers/` directory
- [ ] `SupabasePersistencePort` implements all port methods
- [ ] `InMemoryPersistencePort` implements all port methods
- [ ] Both implementations apply same defaults (status='running', usdCost=0, etc.)
- [ ] Tests verify both implementations behave identically
- [ ] Old `IPersistence` interface still works (no regressions)
- [ ] `tsc` compiles with no errors
- [ ] All existing tests still pass

---

## Next PR

PR3 will migrate @lucky/core call sites from `IPersistence` to `PersistencePort`.

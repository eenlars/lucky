# PR1: Introduce Domain Contracts & Port Interface

**Status:** Not Started
**Estimated Effort:** 2-3 hours
**Risk:** Low (no behavior changes)

---

## Objective

Establish domain-first contracts and port interface that decouple @lucky/core from Supabase-generated types. No behavioral changes—this PR only introduces types and enforces boundaries via linting.

---

## What Changes

### 1. Create `packages/shared/src/contracts/persistence.ts`

Define domain types using business terminology (camelCase, stable):

```typescript
// Entity IDs (branded types for type safety)
export type WorkflowId = string & { readonly __brand: 'WorkflowId' }
export type WorkflowVersionId = string & { readonly __brand: 'WorkflowVersionId' }
export type WorkflowInvocationId = string & { readonly __brand: 'WorkflowInvocationId' }
export type GenerationId = string & { readonly __brand: 'GenerationId' }
export type RunId = string & { readonly __brand: 'RunId' }

// Write Commands (what callers send)
export type CreateWorkflowVersionCmd = {
  versionId?: WorkflowVersionId
  workflowId: WorkflowId
  dsl: unknown
  operation: 'init' | 'crossover' | 'mutation' | 'immigrant'
  commitMessage: string
  generationId?: GenerationId
  parents?: { parent1Id?: WorkflowVersionId; parent2Id?: WorkflowVersionId }
  clerkId?: string
}

export type StartWorkflowInvocationCmd = {
  invocationId: WorkflowInvocationId
  versionId: WorkflowVersionId
  input?: unknown
  run?: { runId: RunId; generationId?: GenerationId }
  clerkId?: string
}

export type CompleteWorkflowInvocationPatch = {
  invocationId: WorkflowInvocationId
  status: 'completed' | 'failed'
  endedAt?: Date
  output?: unknown
  usdCost?: number
  fitness?: unknown
}

// Read Models (what callers get back)
export type WorkflowVersion = {
  id: WorkflowVersionId
  workflowId: WorkflowId
  dsl: unknown
  operation: 'init' | 'crossover' | 'mutation' | 'immigrant'
  commitMessage: string
  generationId?: GenerationId
  parents?: { parent1Id?: WorkflowVersionId; parent2Id?: WorkflowVersionId }
  createdAt: string
}

export type WorkflowInvocation = {
  id: WorkflowInvocationId
  versionId: WorkflowVersionId
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  endedAt?: string
  usdCost: number
  input?: unknown
  output?: unknown
  run?: { runId: RunId; generationId?: GenerationId }
  fitness?: unknown
}
```

### 2. Create `packages/shared/src/contracts/ports.ts`

Port interface that speaks only domain language:

```typescript
export interface PersistencePort {
  workflows: {
    ensure(workflow: { id: WorkflowId; description: string; clerkId?: string }): Promise<void>
  }

  versions: {
    create(cmd: CreateWorkflowVersionCmd): Promise<WorkflowVersion>
    getById(id: WorkflowVersionId): Promise<WorkflowVersion | null>
  }

  invocations: {
    start(cmd: StartWorkflowInvocationCmd): Promise<WorkflowInvocation>
    complete(patch: CompleteWorkflowInvocationPatch): Promise<WorkflowInvocation>
    getById(id: WorkflowInvocationId): Promise<WorkflowInvocation | null>
  }

  withTransaction<T>(fn: (tx: PersistencePort) => Promise<T>): Promise<T>
}
```

### 3. Add ESLint Rule

In `packages/core/.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['**/supabase.types', '**/public.types'],
        message: 'Core cannot import Supabase types. Use domain contracts from @lucky/shared/contracts.'
      }]
    }]
  }
}
```

### 4. Export from Shared

In `packages/shared/src/index.ts`, add:

```typescript
export * from './contracts/persistence'
export * from './contracts/ports'
```

---

## What Does NOT Change

- No implementation changes
- No call-site changes in @lucky/core
- Existing IPersistence interface remains
- Adapter continues to work as before

---

## Testing

```bash
# Verify no imports of Supabase types in core
cd packages/core
npm run lint

# Expected: No errors (since no code changed yet)
```

---

## Verification Checklist

- [ ] `packages/shared/src/contracts/persistence.ts` created
- [ ] `packages/shared/src/contracts/ports.ts` created
- [ ] ESLint rule added to `packages/core/.eslintrc.js`
- [ ] Contracts exported from `packages/shared/src/index.ts`
- [ ] `npm run lint` passes in all packages
- [ ] `tsc` compiles with no new errors
- [ ] No behavioral changes (existing tests still pass)

---

## Next PR

PR2 will implement `PersistencePort` in the adapter, alongside the existing `IPersistence`.
